import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { requireAuth } from './lib/auth';
import { ok, err, authError, notFoundError } from './lib/errors';
import type { AppError, Result } from './lib/errors';
import { unwrapOrThrow } from './lib/result';
import { getProjectRole } from './lib/projectAccess';

const entityTypeValidator = v.union(
  v.literal('character'),
  v.literal('location'),
  v.literal('item'),
  v.literal('concept'),
  v.literal('event')
);

const entityStatusValidator = v.union(v.literal('pending'), v.literal('confirmed'));

async function getProjectAccess(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<'projects'>
): Promise<{
  canRead: boolean;
  canEdit: boolean;
  isViewer: boolean;
  isTtrpgViewer: boolean;
}> {
  const role = await getProjectRole(ctx, projectId);
  const isViewer = role === 'viewer';

  let isTtrpgViewer = false;
  if (isViewer) {
    const project = await ctx.db.get(projectId);
    isTtrpgViewer = project?.projectType === 'ttrpg';
  }

  return {
    canRead: role !== null,
    canEdit: role === 'owner' || role === 'editor',
    isViewer,
    isTtrpgViewer,
  };
}

function filterForTtrpgViewer(
  entities: Doc<'entities'>[],
  isTtrpgViewer: boolean
): Doc<'entities'>[] {
  if (!isTtrpgViewer) return entities;
  return entities.filter((e) => e.revealedToViewers === true);
}

async function verifyProjectAccess(
  ctx: MutationCtx,
  projectId: Id<'projects'>,
  userId: Id<'users'>
): Promise<Result<Doc<'projects'>, AppError>> {
  const project = await ctx.db.get(projectId);
  if (!project) return err(notFoundError('project', projectId));
  if (project.userId !== userId) return err(authError('UNAUTHORIZED', 'Unauthorized'));
  return ok(project);
}

async function verifyEntityAccess(
  ctx: MutationCtx,
  entityId: Id<'entities'>,
  userId: Id<'users'>
): Promise<Result<Doc<'entities'>, AppError>> {
  const entity = await ctx.db.get(entityId);
  if (!entity) return err(notFoundError('entity', entityId));

  const project = await ctx.db.get(entity.projectId);
  if (!project || project.userId !== userId) {
    return err(authError('UNAUTHORIZED', 'Unauthorized'));
  }

  return ok(entity);
}

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    name: v.string(),
    type: entityTypeValidator,
    description: v.optional(v.string()),
    aliases: v.optional(v.array(v.string())),
    firstMentionedIn: v.optional(v.id('documents')),
    status: v.optional(entityStatusValidator),
  },
  handler: async (
    ctx,
    { projectId, name, type, description, aliases, firstMentionedIn, status }
  ) => {
    const userId = await requireAuth(ctx);
    const project = unwrapOrThrow(await verifyProjectAccess(ctx, projectId, userId));

    const now = Date.now();
    const entityId = await ctx.db.insert('entities', {
      projectId,
      name,
      type,
      description,
      aliases: aliases ?? [],
      firstMentionedIn,
      status: status ?? 'pending',
      createdAt: now,
      updatedAt: now,
    });

    const stats = project.stats ?? {
      documentCount: 0,
      entityCount: 0,
      factCount: 0,
      alertCount: 0,
      noteCount: 0,
    };
    await ctx.db.patch(projectId, {
      updatedAt: now,
      stats: { ...stats, entityCount: stats.entityCount + 1 },
    });

    return entityId;
  },
});

export const update = mutation({
  args: {
    id: v.id('entities'),
    name: v.optional(v.string()),
    type: v.optional(entityTypeValidator),
    description: v.optional(v.string()),
    aliases: v.optional(v.array(v.string())),
    status: v.optional(entityStatusValidator),
  },
  handler: async (ctx, { id, name, type, description, aliases, status }) => {
    const userId = await requireAuth(ctx);
    unwrapOrThrow(await verifyEntityAccess(ctx, id, userId));

    await ctx.db.patch(id, {
      updatedAt: Date.now(),
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(description !== undefined && { description }),
      ...(aliases !== undefined && { aliases }),
      ...(status !== undefined && { status }),
    });

    return id;
  },
});

export const merge = mutation({
  args: {
    sourceId: v.id('entities'),
    targetId: v.id('entities'),
  },
  handler: async (ctx, { sourceId, targetId }) => {
    const userId = await requireAuth(ctx);

    const source = unwrapOrThrow(await verifyEntityAccess(ctx, sourceId, userId));
    const target = unwrapOrThrow(await verifyEntityAccess(ctx, targetId, userId));

    if (source.projectId !== target.projectId) {
      throw new Error('Cannot merge entities from different projects');
    }

    const mergedAliases = [...new Set([...target.aliases, source.name, ...source.aliases])];

    await ctx.db.patch(targetId, {
      aliases: mergedAliases,
      updatedAt: Date.now(),
    });

    const factsToUpdate = await ctx.db
      .query('facts')
      .withIndex('by_entity', (q) => q.eq('entityId', sourceId))
      .collect();

    for (const fact of factsToUpdate) {
      await ctx.db.patch(fact._id, { entityId: targetId });
    }

    await ctx.db.delete(sourceId);

    const project = await ctx.db.get(source.projectId);
    if (project) {
      const stats = project.stats ?? {
        documentCount: 0,
        entityCount: 0,
        factCount: 0,
        alertCount: 0,
        noteCount: 0,
      };
      await ctx.db.patch(source.projectId, {
        updatedAt: Date.now(),
        stats: { ...stats, entityCount: Math.max(0, stats.entityCount - 1) },
      });
    }

    return targetId;
  },
});

export const listByProject = query({
  args: {
    projectId: v.id('projects'),
    type: v.optional(entityTypeValidator),
    status: v.optional(entityStatusValidator),
  },
  handler: async (ctx, { projectId, type, status }) => {
    const access = await getProjectAccess(ctx, projectId);
    if (!access.canRead) return [];

    const effectiveStatus = access.isViewer ? 'confirmed' : status;
    let entities;

    if (type && effectiveStatus) {
      entities = await ctx.db
        .query('entities')
        .withIndex('by_project_status', (q) =>
          q.eq('projectId', projectId).eq('status', effectiveStatus)
        )
        .filter((q) => q.eq(q.field('type'), type))
        .collect();
    } else if (type) {
      entities = await ctx.db
        .query('entities')
        .withIndex('by_project', (q) => q.eq('projectId', projectId).eq('type', type))
        .collect();
      if (access.isViewer) {
        entities = entities.filter((e) => e.status === 'confirmed');
      }
    } else if (effectiveStatus) {
      entities = await ctx.db
        .query('entities')
        .withIndex('by_project_status', (q) =>
          q.eq('projectId', projectId).eq('status', effectiveStatus)
        )
        .collect();
    } else {
      entities = await ctx.db
        .query('entities')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect();
      if (access.isViewer) {
        entities = entities.filter((e) => e.status === 'confirmed');
      }
    }

    return entities;
  },
});

const sortByValidator = v.union(v.literal('name'), v.literal('recent'), v.literal('factCount'));

export const listByProjectWithStats = query({
  args: {
    projectId: v.id('projects'),
    type: v.optional(entityTypeValidator),
    status: v.optional(entityStatusValidator),
    sortBy: v.optional(sortByValidator),
  },
  handler: async (ctx, { projectId, type, status, sortBy = 'name' }) => {
    const access = await getProjectAccess(ctx, projectId);
    if (!access.canRead) return [];

    const effectiveStatus = access.isViewer ? 'confirmed' : status;
    let entities;

    if (type && effectiveStatus) {
      entities = await ctx.db
        .query('entities')
        .withIndex('by_project_status', (q) =>
          q.eq('projectId', projectId).eq('status', effectiveStatus)
        )
        .filter((q) => q.eq(q.field('type'), type))
        .collect();
    } else if (type) {
      entities = await ctx.db
        .query('entities')
        .withIndex('by_project', (q) => q.eq('projectId', projectId).eq('type', type))
        .collect();
      if (access.isViewer) {
        entities = entities.filter((e) => e.status === 'confirmed');
      }
    } else if (effectiveStatus) {
      entities = await ctx.db
        .query('entities')
        .withIndex('by_project_status', (q) =>
          q.eq('projectId', projectId).eq('status', effectiveStatus)
        )
        .collect();
    } else {
      entities = await ctx.db
        .query('entities')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect();
      if (access.isViewer) {
        entities = entities.filter((e) => e.status === 'confirmed');
      }
    }

    const entitiesWithStats = await Promise.all(
      entities.map(async (entity) => {
        const facts = await ctx.db
          .query('facts')
          .withIndex('by_entity', (q) => q.eq('entityId', entity._id))
          .filter((q) => q.neq(q.field('status'), 'rejected'))
          .collect();
        return {
          ...entity,
          factCount: facts.length,
        };
      })
    );

    return [...entitiesWithStats].toSorted((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'recent':
          return b.updatedAt - a.updatedAt;
        case 'factCount':
          return b.factCount - a.factCount;
        default:
          return a.name.localeCompare(b.name);
      }
    });
  },
});

export const getWithFacts = query({
  args: { id: v.id('entities') },
  handler: async (ctx, { id }) => {
    const entity = await ctx.db.get(id);
    if (!entity) return null;

    const access = await getProjectAccess(ctx, entity.projectId);
    if (!access.canRead) return null;
    if (access.isViewer && entity.status !== 'confirmed') return null;

    const facts = await ctx.db
      .query('facts')
      .withIndex('by_entity', (q) => q.eq('entityId', id))
      .collect();

    const filteredFacts = access.isViewer ? facts.filter((f) => f.status === 'confirmed') : facts;

    return { entity, facts: filteredFacts };
  },
});

export const remove = mutation({
  args: { id: v.id('entities') },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    const entity = unwrapOrThrow(await verifyEntityAccess(ctx, id, userId));

    const facts = await ctx.db
      .query('facts')
      .withIndex('by_entity', (q) => q.eq('entityId', id))
      .collect();

    const nonRejectedCount = facts.filter((f) => f.status !== 'rejected').length;
    for (const fact of facts) {
      await ctx.db.delete(fact._id);
    }

    await ctx.db.delete(id);

    const project = await ctx.db.get(entity.projectId);
    if (project) {
      const stats = project.stats ?? {
        documentCount: 0,
        entityCount: 0,
        factCount: 0,
        alertCount: 0,
        noteCount: 0,
      };
      await ctx.db.patch(entity.projectId, {
        updatedAt: Date.now(),
        stats: {
          ...stats,
          entityCount: Math.max(0, stats.entityCount - 1),
          factCount: Math.max(0, stats.factCount - nonRejectedCount),
        },
      });
    }

    return id;
  },
});

export const get = query({
  args: { id: v.id('entities') },
  handler: async (ctx, { id }) => {
    const entity = await ctx.db.get(id);
    if (!entity) return null;

    const access = await getProjectAccess(ctx, entity.projectId);
    if (!access.canRead) return null;
    if (access.isViewer && entity.status !== 'confirmed') return null;

    return entity;
  },
});

export const findByName = query({
  args: {
    projectId: v.id('projects'),
    name: v.string(),
  },
  handler: async (ctx, { projectId, name }) => {
    const access = await getProjectAccess(ctx, projectId);
    if (!access.canRead) return null;

    const entity = await ctx.db
      .query('entities')
      .withIndex('by_name', (q) => q.eq('projectId', projectId).eq('name', name))
      .first();

    if (entity && access.isViewer && entity.status !== 'confirmed') return null;

    return entity;
  },
});

export const confirm = mutation({
  args: { id: v.id('entities') },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    unwrapOrThrow(await verifyEntityAccess(ctx, id, userId));

    await ctx.db.patch(id, {
      status: 'confirmed',
      updatedAt: Date.now(),
    });

    return id;
  },
});

export const reject = mutation({
  args: { id: v.id('entities') },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    const entity = unwrapOrThrow(await verifyEntityAccess(ctx, id, userId));

    const facts = await ctx.db
      .query('facts')
      .withIndex('by_entity', (q) => q.eq('entityId', id))
      .collect();

    const nonRejectedCount = facts.filter((f) => f.status !== 'rejected').length;
    for (const fact of facts) {
      await ctx.db.delete(fact._id);
    }

    await ctx.db.delete(id);

    const project = await ctx.db.get(entity.projectId);
    if (project) {
      const stats = project.stats ?? {
        documentCount: 0,
        entityCount: 0,
        factCount: 0,
        alertCount: 0,
        noteCount: 0,
      };
      await ctx.db.patch(entity.projectId, {
        updatedAt: Date.now(),
        stats: {
          ...stats,
          entityCount: Math.max(0, stats.entityCount - 1),
          factCount: Math.max(0, stats.factCount - nonRejectedCount),
        },
      });
    }

    return id;
  },
});

export const listPending = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const access = await getProjectAccess(ctx, projectId);
    if (!access.canEdit) return [];

    return await ctx.db
      .query('entities')
      .withIndex('by_project_status', (q) => q.eq('projectId', projectId).eq('status', 'pending'))
      .collect();
  },
});

export const listByProjectPaginated = query({
  args: {
    projectId: v.id('projects'),
    type: v.optional(entityTypeValidator),
    status: v.optional(entityStatusValidator),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { projectId, type, status, paginationOpts }) => {
    const access = await getProjectAccess(ctx, projectId);
    if (!access.canRead) {
      return { page: [], isDone: true, continueCursor: '' };
    }

    const effectiveStatus = access.isViewer ? 'confirmed' : status;

    if (type && effectiveStatus) {
      const result = await ctx.db
        .query('entities')
        .withIndex('by_project_status', (q) =>
          q.eq('projectId', projectId).eq('status', effectiveStatus)
        )
        .filter((q) => {
          const typeMatch = q.eq(q.field('type'), type);
          if (access.isTtrpgViewer) {
            return q.and(typeMatch, q.eq(q.field('revealedToViewers'), true));
          }
          return typeMatch;
        })
        .paginate(paginationOpts);
      return result;
    } else if (type) {
      if (access.isViewer) {
        const result = await ctx.db
          .query('entities')
          .withIndex('by_project_status', (q) =>
            q.eq('projectId', projectId).eq('status', 'confirmed')
          )
          .filter((q) => {
            const typeMatch = q.eq(q.field('type'), type);
            if (access.isTtrpgViewer) {
              return q.and(typeMatch, q.eq(q.field('revealedToViewers'), true));
            }
            return typeMatch;
          })
          .paginate(paginationOpts);
        return result;
      }
      return await ctx.db
        .query('entities')
        .withIndex('by_project', (q) => q.eq('projectId', projectId).eq('type', type))
        .paginate(paginationOpts);
    } else if (effectiveStatus) {
      if (access.isTtrpgViewer) {
        return await ctx.db
          .query('entities')
          .withIndex('by_project_status', (q) =>
            q.eq('projectId', projectId).eq('status', effectiveStatus)
          )
          .filter((q) => q.eq(q.field('revealedToViewers'), true))
          .paginate(paginationOpts);
      }
      return await ctx.db
        .query('entities')
        .withIndex('by_project_status', (q) =>
          q.eq('projectId', projectId).eq('status', effectiveStatus)
        )
        .paginate(paginationOpts);
    } else {
      if (access.isViewer) {
        if (access.isTtrpgViewer) {
          return await ctx.db
            .query('entities')
            .withIndex('by_project_status', (q) =>
              q.eq('projectId', projectId).eq('status', 'confirmed')
            )
            .filter((q) => q.eq(q.field('revealedToViewers'), true))
            .paginate(paginationOpts);
        }
        return await ctx.db
          .query('entities')
          .withIndex('by_project_status', (q) =>
            q.eq('projectId', projectId).eq('status', 'confirmed')
          )
          .paginate(paginationOpts);
      }
      return await ctx.db
        .query('entities')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .paginate(paginationOpts);
    }
  },
});

export const findSimilar = query({
  args: {
    projectId: v.id('projects'),
    name: v.string(),
    excludeId: v.optional(v.id('entities')),
  },
  handler: async (ctx, { projectId, name, excludeId }) => {
    const access = await getProjectAccess(ctx, projectId);
    if (!access.canRead) return [];

    let allEntities = await ctx.db
      .query('entities')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect();

    if (access.isViewer) {
      allEntities = allEntities.filter((e) => e.status === 'confirmed');
    }

    const normalizedName = name.toLowerCase().trim();

    return allEntities.filter((entity) => {
      if (excludeId && entity._id === excludeId) return false;

      const entityName = entity.name.toLowerCase().trim();
      if (entityName === normalizedName) return false;

      if (entityName.includes(normalizedName) || normalizedName.includes(entityName)) {
        return true;
      }

      const entityAliases = entity.aliases.map((a) => a.toLowerCase().trim());
      if (entityAliases.includes(normalizedName)) {
        return true;
      }

      return false;
    });
  },
});

export const search = query({
  args: {
    projectId: v.id('projects'),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { projectId, query, limit = 20 }) => {
    const access = await getProjectAccess(ctx, projectId);
    if (!access.canRead) return [];

    if (!query.trim()) return [];

    const [nameResults, descriptionResults] = await Promise.all([
      ctx.db
        .query('entities')
        .withSearchIndex('search_name', (q) => q.search('name', query).eq('projectId', projectId))
        .take(limit),
      ctx.db
        .query('entities')
        .withSearchIndex('search_description', (q) =>
          q.search('description', query).eq('projectId', projectId)
        )
        .take(limit),
    ]);

    const seen = new Set<string>();
    const combined: Doc<'entities'>[] = [];

    for (const entity of [...nameResults, ...descriptionResults]) {
      if (!seen.has(entity._id)) {
        if (access.isViewer && entity.status !== 'confirmed') continue;
        seen.add(entity._id);
        combined.push(entity);
      }
      if (combined.length >= limit) break;
    }

    return combined;
  },
});

export const getWithDetails = query({
  args: { id: v.id('entities') },
  handler: async (ctx, { id }) => {
    const entity = await ctx.db.get(id);
    if (!entity) return null;

    const access = await getProjectAccess(ctx, entity.projectId);
    if (!access.canRead) return null;
    if (access.isViewer && entity.status !== 'confirmed') return null;
    if (access.isTtrpgViewer && entity.revealedToViewers !== true) return null;

    let facts = await ctx.db
      .query('facts')
      .withIndex('by_entity', (q) => q.eq('entityId', id))
      .filter((q) => q.neq(q.field('status'), 'rejected'))
      .collect();

    if (access.isViewer) {
      facts = facts.filter((f) => f.status === 'confirmed');
    }

    const documentIds = [...new Set(facts.map((f) => f.documentId))];
    const documents = await Promise.all(documentIds.map((docId) => ctx.db.get(docId)));
    const appearances = documents
      .filter((doc): doc is Doc<'documents'> => doc !== null)
      .map((doc) => ({
        _id: doc._id,
        title: doc.title,
        orderIndex: doc.orderIndex,
      }))
      .slice()
      .toSorted((a, b) => a.orderIndex - b.orderIndex);

    const allEntities = await ctx.db
      .query('entities')
      .withIndex('by_project', (q) => q.eq('projectId', entity.projectId))
      .collect();

    const relatedEntityIds = new Set<Id<'entities'>>();
    for (const fact of facts) {
      const objectLower = fact.object.toLowerCase().trim();
      for (const otherEntity of allEntities) {
        if (otherEntity._id === id) continue;
        const nameLower = otherEntity.name.toLowerCase().trim();
        const aliasesLower = otherEntity.aliases.map((a) => a.toLowerCase().trim());

        const nameRegex = new RegExp(`\\b${nameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        const nameIsSingleWord = !nameLower.includes(' ');
        const nameMinLength = nameIsSingleWord ? 5 : 3;
        const matchesName = nameLower.length >= nameMinLength && nameRegex.test(objectLower);
        const matchesAlias = aliasesLower.some((a) => {
          const aliasIsSingleWord = !a.includes(' ');
          const aliasMinLength = aliasIsSingleWord ? 5 : 3;
          if (a.length < aliasMinLength) return false;
          const aliasRegex = new RegExp(`\\b${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
          return aliasRegex.test(objectLower);
        });
        if (matchesName || matchesAlias) {
          relatedEntityIds.add(otherEntity._id);
        }
      }
    }

    const relatedEntities = allEntities.filter((e) => relatedEntityIds.has(e._id));

    return {
      entity,
      facts,
      appearances,
      relatedEntities,
    };
  },
});

export const listEvents = query({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, { projectId }) => {
    const access = await getProjectAccess(ctx, projectId);
    if (!access.canRead) return [];

    let events = await ctx.db
      .query('entities')
      .withIndex('by_project', (q) => q.eq('projectId', projectId).eq('type', 'event'))
      .filter((q) => q.eq(q.field('status'), 'confirmed'))
      .collect();

    events = filterForTtrpgViewer(events, access.isTtrpgViewer);

    const eventsWithDocs = await Promise.all(
      events.map(async (event) => {
        const document = event.firstMentionedIn ? await ctx.db.get(event.firstMentionedIn) : null;
        return {
          ...event,
          document:
            document ?
              { _id: document._id, title: document.title, orderIndex: document.orderIndex }
            : null,
        };
      })
    );

    return eventsWithDocs.toSorted((a, b) => {
      const orderA = a.document?.orderIndex ?? Infinity;
      const orderB = b.document?.orderIndex ?? Infinity;
      return orderA - orderB;
    });
  },
});

export const getTimeline = query({
  args: {
    projectId: v.id('projects'),
    entityFilter: v.optional(v.id('entities')),
    includeAppearances: v.optional(v.boolean()),
  },
  handler: async (ctx, { projectId, entityFilter, includeAppearances = false }) => {
    const access = await getProjectAccess(ctx, projectId);
    if (!access.canRead) return { events: [], appearances: [], entities: [] };

    let allEntities = await ctx.db
      .query('entities')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .filter((q) => q.eq(q.field('status'), 'confirmed'))
      .collect();

    allEntities = filterForTtrpgViewer(allEntities, access.isTtrpgViewer);

    const events = allEntities.filter((e) => e.type === 'event');

    const eventsWithDetails = await Promise.all(
      events.map(async (event) => {
        const document = event.firstMentionedIn ? await ctx.db.get(event.firstMentionedIn) : null;

        const facts = await ctx.db
          .query('facts')
          .withIndex('by_entity', (q) => q.eq('entityId', event._id))
          .filter((q) => q.neq(q.field('status'), 'rejected'))
          .collect();

        const involvedEntityIds = new Set<Id<'entities'>>();
        for (const fact of facts) {
          const objectLower = fact.object.toLowerCase().trim();
          for (const entity of allEntities) {
            if (entity._id === event._id || entity.type === 'event') continue;
            const nameLower = entity.name.toLowerCase().trim();
            const nameRegex = new RegExp(
              `\\b${nameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`
            );
            const nameIsSingleWord = !nameLower.includes(' ');
            const nameMinLength = nameIsSingleWord ? 5 : 3;
            if (nameLower.length >= nameMinLength && nameRegex.test(objectLower)) {
              involvedEntityIds.add(entity._id);
            }
          }
        }

        const involvedEntities = allEntities
          .filter((e) => involvedEntityIds.has(e._id))
          .map((e) => ({ _id: e._id, name: e.name, type: e.type }));

        return {
          ...event,
          document:
            document ?
              { _id: document._id, title: document.title, orderIndex: document.orderIndex }
            : null,
          involvedEntities,
        };
      })
    );

    let filteredEvents = eventsWithDetails;
    if (entityFilter) {
      filteredEvents = eventsWithDetails.filter(
        (e) => e._id === entityFilter || e.involvedEntities.some((ie) => ie._id === entityFilter)
      );
    }

    const sortedEvents = filteredEvents.toSorted((a, b) => {
      const orderA = a.document?.orderIndex ?? Infinity;
      const orderB = b.document?.orderIndex ?? Infinity;
      return orderA - orderB;
    });

    let appearances: Array<{
      _id: Id<'entities'>;
      name: string;
      type: string;
      document: { _id: Id<'documents'>; title: string; orderIndex: number } | null;
    }> = [];

    if (includeAppearances) {
      const nonEvents = allEntities.filter((e) => e.type !== 'event' && e.firstMentionedIn);

      if (entityFilter) {
        const filtered = nonEvents.filter((e) => e._id === entityFilter);
        appearances = await Promise.all(
          filtered.map(async (entity) => {
            const doc = entity.firstMentionedIn ? await ctx.db.get(entity.firstMentionedIn) : null;
            return {
              _id: entity._id,
              name: entity.name,
              type: entity.type,
              document: doc ? { _id: doc._id, title: doc.title, orderIndex: doc.orderIndex } : null,
            };
          })
        );
      } else {
        appearances = await Promise.all(
          nonEvents.map(async (entity) => {
            const doc = entity.firstMentionedIn ? await ctx.db.get(entity.firstMentionedIn) : null;
            return {
              _id: entity._id,
              name: entity.name,
              type: entity.type,
              document: doc ? { _id: doc._id, title: doc.title, orderIndex: doc.orderIndex } : null,
            };
          })
        );
      }

      appearances = appearances.toSorted((a, b) => {
        const orderA = a.document?.orderIndex ?? Infinity;
        const orderB = b.document?.orderIndex ?? Infinity;
        return orderA - orderB;
      });
    }

    const filterableEntities = allEntities
      .filter((e) => e.type !== 'event')
      .map((e) => ({ _id: e._id, name: e.name, type: e.type }))
      .toSorted((a, b) => a.name.localeCompare(b.name));

    return {
      events: sortedEvents,
      appearances,
      entities: filterableEntities,
    };
  },
});

export const getRelationshipGraph = query({
  args: {
    projectId: v.id('projects'),
    entityFilter: v.optional(v.id('entities')),
  },
  handler: async (ctx, { projectId, entityFilter }) => {
    const access = await getProjectAccess(ctx, projectId);
    if (!access.canRead) return { nodes: [], edges: [] };

    let allEntities = await ctx.db
      .query('entities')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .filter((q) => q.eq(q.field('status'), 'confirmed'))
      .collect();

    allEntities = filterForTtrpgViewer(allEntities, access.isTtrpgViewer);

    let allFacts = await ctx.db
      .query('facts')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .filter((q) => q.neq(q.field('status'), 'rejected'))
      .collect();

    if (access.isViewer) {
      allFacts = allFacts.filter((f) => f.status === 'confirmed');
    }

    type Edge = {
      source: Id<'entities'>;
      target: Id<'entities'>;
      label: string;
      factId: Id<'facts'>;
    };

    const edges: Edge[] = [];
    const connectedEntityIds = new Set<Id<'entities'>>();

    for (const fact of allFacts) {
      const sourceEntity = allEntities.find((e) => e._id === fact.entityId);
      if (!sourceEntity) continue;

      const objectLower = fact.object.toLowerCase().trim();

      for (const targetEntity of allEntities) {
        if (targetEntity._id === fact.entityId) continue;

        const nameLower = targetEntity.name.toLowerCase().trim();
        const aliasesLower = targetEntity.aliases.map((a) => a.toLowerCase().trim());

        const nameRegex = new RegExp(`\\b${nameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        const nameIsSingleWord = !nameLower.includes(' ');
        const nameMinLength = nameIsSingleWord ? 5 : 3;
        const matchesName = nameLower.length >= nameMinLength && nameRegex.test(objectLower);

        const matchesAlias = aliasesLower.some((a) => {
          const aliasIsSingleWord = !a.includes(' ');
          const aliasMinLength = aliasIsSingleWord ? 5 : 3;
          if (a.length < aliasMinLength) return false;
          const aliasRegex = new RegExp(`\\b${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
          return aliasRegex.test(objectLower);
        });

        if (matchesName || matchesAlias) {
          edges.push({
            source: fact.entityId,
            target: targetEntity._id,
            label: fact.predicate,
            factId: fact._id,
          });
          connectedEntityIds.add(fact.entityId);
          connectedEntityIds.add(targetEntity._id);
        }
      }
    }

    let filteredEdges = edges;
    let relevantEntityIds = connectedEntityIds;

    if (entityFilter) {
      filteredEdges = edges.filter((e) => e.source === entityFilter || e.target === entityFilter);
      relevantEntityIds = new Set<Id<'entities'>>();
      for (const edge of filteredEdges) {
        relevantEntityIds.add(edge.source);
        relevantEntityIds.add(edge.target);
      }
    }

    const nodes = allEntities
      .filter((e) => relevantEntityIds.has(e._id))
      .map((e) => ({
        id: e._id,
        name: e.name,
        type: e.type,
      }));

    return { nodes, edges: filteredEdges };
  },
});

export const revealToPlayers = mutation({
  args: {
    entityId: v.id('entities'),
  },
  handler: async (ctx, { entityId }) => {
    const userId = await requireAuth(ctx);
    const entity = await ctx.db.get(entityId);
    if (!entity) throw new Error('Entity not found');

    const project = await ctx.db.get(entity.projectId);
    if (!project || project.userId !== userId) {
      throw new Error('Not authorized');
    }

    if (project.projectType !== 'ttrpg') {
      throw new Error('Reveal is only available for TTRPG projects');
    }

    await ctx.db.patch(entityId, {
      revealedToViewers: true,
      revealedAt: Date.now(),
    });

    return entityId;
  },
});

export const hideFromPlayers = mutation({
  args: {
    entityId: v.id('entities'),
  },
  handler: async (ctx, { entityId }) => {
    const userId = await requireAuth(ctx);
    const entity = await ctx.db.get(entityId);
    if (!entity) throw new Error('Entity not found');

    const project = await ctx.db.get(entity.projectId);
    if (!project || project.userId !== userId) {
      throw new Error('Not authorized');
    }

    if (project.projectType !== 'ttrpg') {
      throw new Error('Hide is only available for TTRPG projects');
    }

    await ctx.db.patch(entityId, {
      revealedToViewers: false,
      revealedAt: undefined,
    });

    return entityId;
  },
});
