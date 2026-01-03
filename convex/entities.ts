import { v } from 'convex/values';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { getAuthUserId, requireAuth } from './lib/auth';

const entityTypeValidator = v.union(
  v.literal('character'),
  v.literal('location'),
  v.literal('item'),
  v.literal('concept'),
  v.literal('event')
);

const entityStatusValidator = v.union(v.literal('pending'), v.literal('confirmed'));

async function verifyProjectOwnership(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<'projects'>
): Promise<boolean> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return false;

  const project = await ctx.db.get(projectId);
  if (!project) return false;

  return project.userId === userId;
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
    await requireAuth(ctx);

    const isOwner = await verifyProjectOwnership(ctx, projectId);
    if (!isOwner) {
      throw new Error('Unauthorized: Not project owner');
    }

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

    const project = await ctx.db.get(projectId);
    if (project?.stats) {
      await ctx.db.patch(projectId, {
        updatedAt: now,
        stats: {
          ...project.stats,
          entityCount: project.stats.entityCount + 1,
        },
      });
    }

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
    await requireAuth(ctx);

    const entity = await ctx.db.get(id);
    if (!entity) {
      throw new Error('Entity not found');
    }

    const isOwner = await verifyProjectOwnership(ctx, entity.projectId);
    if (!isOwner) {
      throw new Error('Unauthorized');
    }

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
    await requireAuth(ctx);

    const source = await ctx.db.get(sourceId);
    const target = await ctx.db.get(targetId);

    if (!source || !target) {
      throw new Error('Entity not found');
    }

    if (source.projectId !== target.projectId) {
      throw new Error(
        'Cannot merge entities from different projects. Entities must be in the same project.'
      );
    }

    const isOwner = await verifyProjectOwnership(ctx, source.projectId);
    if (!isOwner) {
      throw new Error('Unauthorized');
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
    if (project?.stats) {
      await ctx.db.patch(source.projectId, {
        updatedAt: Date.now(),
        stats: {
          ...project.stats,
          entityCount: Math.max(0, project.stats.entityCount - 1),
        },
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
    const isOwner = await verifyProjectOwnership(ctx, projectId);
    if (!isOwner) return [];

    let entities;

    if (type && status) {
      entities = await ctx.db
        .query('entities')
        .withIndex('by_project_status', (q) => q.eq('projectId', projectId).eq('status', status))
        .filter((q) => q.eq(q.field('type'), type))
        .collect();
    } else if (type) {
      entities = await ctx.db
        .query('entities')
        .withIndex('by_project', (q) => q.eq('projectId', projectId).eq('type', type))
        .collect();
    } else if (status) {
      entities = await ctx.db
        .query('entities')
        .withIndex('by_project_status', (q) => q.eq('projectId', projectId).eq('status', status))
        .collect();
    } else {
      entities = await ctx.db
        .query('entities')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect();
    }

    return entities;
  },
});

export const getWithFacts = query({
  args: { id: v.id('entities') },
  handler: async (ctx, { id }) => {
    const entity = await ctx.db.get(id);
    if (!entity) return null;

    const isOwner = await verifyProjectOwnership(ctx, entity.projectId);
    if (!isOwner) return null;

    const facts = await ctx.db
      .query('facts')
      .withIndex('by_entity', (q) => q.eq('entityId', id))
      .collect();

    return { entity, facts };
  },
});

export const remove = mutation({
  args: { id: v.id('entities') },
  handler: async (ctx, { id }) => {
    await requireAuth(ctx);

    const entity = await ctx.db.get(id);
    if (!entity) {
      throw new Error('Entity not found');
    }

    const isOwner = await verifyProjectOwnership(ctx, entity.projectId);
    if (!isOwner) {
      throw new Error('Unauthorized');
    }

    const facts = await ctx.db
      .query('facts')
      .withIndex('by_entity', (q) => q.eq('entityId', id))
      .collect();

    const factCount = facts.length;
    for (const fact of facts) {
      await ctx.db.delete(fact._id);
    }

    await ctx.db.delete(id);

    const project = await ctx.db.get(entity.projectId);
    if (project?.stats) {
      await ctx.db.patch(entity.projectId, {
        updatedAt: Date.now(),
        stats: {
          ...project.stats,
          entityCount: Math.max(0, project.stats.entityCount - 1),
          factCount: Math.max(0, project.stats.factCount - factCount),
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

    const isOwner = await verifyProjectOwnership(ctx, entity.projectId);
    if (!isOwner) return null;

    return entity;
  },
});

export const findByName = query({
  args: {
    projectId: v.id('projects'),
    name: v.string(),
  },
  handler: async (ctx, { projectId, name }) => {
    const isOwner = await verifyProjectOwnership(ctx, projectId);
    if (!isOwner) return null;

    return await ctx.db
      .query('entities')
      .withIndex('by_name', (q) => q.eq('projectId', projectId).eq('name', name))
      .first();
  },
});
