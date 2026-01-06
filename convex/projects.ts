import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import { getAuthUserId, requireAuth } from './lib/auth';
import { ok, err, notFoundError, authError, type Result, type AppError } from './lib/errors';
import { unwrapOrThrow } from './lib/result';
import { getProjectRole, canReadProject } from './lib/projectAccess';

async function verifyProjectAccess(
  ctx: MutationCtx,
  projectId: Id<'projects'>,
  userId: Id<'users'>
): Promise<Result<Doc<'projects'>, AppError>> {
  const project = await ctx.db.get(projectId);
  if (!project) {
    return err(notFoundError('project', projectId));
  }
  if (project.userId !== userId) {
    return err(authError('UNAUTHORIZED', 'Unauthorized'));
  }
  return ok(project);
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query('projects')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .collect();
  },
});

export const listSharedWithMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const shares = await ctx.db
      .query('projectShares')
      .withIndex('by_user', (q) => q.eq('sharedWithUserId', userId))
      .filter((q) => q.neq(q.field('acceptedAt'), undefined))
      .collect();

    const projectsWithRole = await Promise.all(
      shares.map(async (share) => {
        const project = await ctx.db.get(share.projectId);
        if (!project) return null;
        return { ...project, role: share.role };
      })
    );

    return projectsWithRole.filter(Boolean) as (Doc<'projects'> & {
      role: 'editor' | 'viewer';
    })[];
  },
});

export const get = query({
  args: { id: v.id('projects') },
  handler: async (ctx, { id }) => {
    const project = await ctx.db.get(id);
    if (!project) return null;

    const canRead = await canReadProject(ctx, id);
    if (!canRead) return null;

    return project;
  },
});

const projectTypeValidator = v.optional(
  v.union(
    v.literal('ttrpg'),
    v.literal('original-fiction'),
    v.literal('fanfiction'),
    v.literal('game-design'),
    v.literal('general')
  )
);

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    projectType: projectTypeValidator,
  },
  handler: async (ctx, { name, description, projectType }) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();

    let effectiveProjectType = projectType;
    if (!effectiveProjectType) {
      const user = await ctx.db.get(userId);
      const userModes = user?.settings?.projectModes;
      effectiveProjectType = userModes?.[0] ?? 'general';
    }

    return await ctx.db.insert('projects', {
      userId,
      name,
      description,
      projectType: effectiveProjectType,
      createdAt: now,
      updatedAt: now,
      stats: {
        documentCount: 0,
        entityCount: 0,
        factCount: 0,
        alertCount: 0,
        noteCount: 0,
      },
    });
  },
});

export const update = mutation({
  args: {
    id: v.id('projects'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    projectType: projectTypeValidator,
  },
  handler: async (ctx, { id, name, description, projectType }) => {
    const userId = await requireAuth(ctx);
    const project = unwrapOrThrow(await verifyProjectAccess(ctx, id, userId));

    const updates: Partial<typeof project> = { updatedAt: Date.now() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (projectType !== undefined) updates.projectType = projectType;

    await ctx.db.patch(id, updates);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id('projects') },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    unwrapOrThrow(await verifyProjectAccess(ctx, id, userId));

    const documents = await ctx.db
      .query('documents')
      .withIndex('by_project', (q) => q.eq('projectId', id))
      .collect();

    for (const doc of documents) {
      if (doc.storageId) {
        await ctx.storage.delete(doc.storageId);
      }
      await ctx.db.delete(doc._id);
    }

    const entities = await ctx.db
      .query('entities')
      .withIndex('by_project', (q) => q.eq('projectId', id))
      .collect();

    for (const entity of entities) {
      await ctx.db.delete(entity._id);
    }

    const facts = await ctx.db
      .query('facts')
      .withIndex('by_project', (q) => q.eq('projectId', id))
      .collect();

    for (const fact of facts) {
      await ctx.db.delete(fact._id);
    }

    const alerts = await ctx.db
      .query('alerts')
      .withIndex('by_project', (q) => q.eq('projectId', id))
      .collect();

    for (const alert of alerts) {
      await ctx.db.delete(alert._id);
    }

    const shares = await ctx.db
      .query('projectShares')
      .withIndex('by_project', (q) => q.eq('projectId', id))
      .collect();

    for (const share of shares) {
      await ctx.db.delete(share._id);
    }

    await ctx.db.delete(id);
    return id;
  },
});

export const updateStats = mutation({
  args: {
    id: v.id('projects'),
    stats: v.object({
      documentCount: v.optional(v.number()),
      entityCount: v.optional(v.number()),
      factCount: v.optional(v.number()),
      alertCount: v.optional(v.number()),
      noteCount: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { id, stats }) => {
    const userId = await requireAuth(ctx);
    const project = unwrapOrThrow(await verifyProjectAccess(ctx, id, userId));

    const currentStats = project.stats ?? {
      documentCount: 0,
      entityCount: 0,
      factCount: 0,
      alertCount: 0,
      noteCount: 0,
    };

    await ctx.db.patch(id, {
      updatedAt: Date.now(),
      stats: {
        documentCount: stats.documentCount ?? currentStats.documentCount,
        entityCount: stats.entityCount ?? currentStats.entityCount,
        factCount: stats.factCount ?? currentStats.factCount,
        alertCount: stats.alertCount ?? currentStats.alertCount,
        noteCount: stats.noteCount ?? currentStats.noteCount,
      },
    });
  },
});

export const getCanonStats = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const role = await getProjectRole(ctx, projectId);
    if (!role) return null;

    const project = await ctx.db.get(projectId);
    if (!project) return null;

    const confirmedEntities = await ctx.db
      .query('entities')
      .withIndex('by_project_status', (q) => q.eq('projectId', projectId).eq('status', 'confirmed'))
      .collect();

    const confirmedFacts = await ctx.db
      .query('facts')
      .withIndex('by_project', (q) => q.eq('projectId', projectId).eq('status', 'confirmed'))
      .collect();

    const allDocuments = await ctx.db
      .query('documents')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect();

    const processedDocuments = allDocuments.filter(
      (d) => d.processingStatus === 'completed'
    ).length;

    const entityCounts = {
      character: 0,
      location: 0,
      item: 0,
      concept: 0,
      event: 0,
    };

    for (const entity of confirmedEntities) {
      entityCounts[entity.type]++;
    }

    const coveragePercent =
      allDocuments.length > 0 ? (processedDocuments / allDocuments.length) * 100 : 0;

    return {
      totalEntities: confirmedEntities.length,
      totalFacts: confirmedFacts.length,
      totalDocuments: allDocuments.length,
      processedDocuments,
      coverage: Math.round(coveragePercent),
      entityCounts,
    };
  },
});
