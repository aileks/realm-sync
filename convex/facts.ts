import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { requireAuth } from './lib/auth';
import { getProjectRole } from './lib/projectAccess';
import { ok, err, authError, notFoundError } from './lib/errors';
import type { AppError, Result } from './lib/errors';
import { unwrapOrThrow } from './lib/result';

const factStatusValidator = v.union(
  v.literal('pending'),
  v.literal('confirmed'),
  v.literal('rejected')
);

const temporalBoundValidator = v.object({
  type: v.union(v.literal('point'), v.literal('range'), v.literal('relative')),
  value: v.string(),
});

async function getProjectAccess(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<'projects'>
): Promise<{ canRead: boolean; canEdit: boolean }> {
  const role = await getProjectRole(ctx, projectId);
  return {
    canRead: role !== null,
    canEdit: role === 'owner',
  };
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

async function verifyFactAccess(
  ctx: MutationCtx,
  factId: Id<'facts'>,
  userId: Id<'users'>
): Promise<Result<Doc<'facts'>, AppError>> {
  const fact = await ctx.db.get(factId);
  if (!fact) return err(notFoundError('fact', factId));

  const project = await ctx.db.get(fact.projectId);
  if (!project || project.userId !== userId) {
    return err(authError('UNAUTHORIZED', 'Unauthorized'));
  }

  return ok(fact);
}

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    entityId: v.optional(v.id('entities')),
    documentId: v.optional(v.id('documents')),
    subject: v.string(),
    predicate: v.string(),
    object: v.string(),
    confidence: v.number(),
    evidenceSnippet: v.optional(v.string()),
    evidencePosition: v.optional(
      v.object({
        start: v.number(),
        end: v.number(),
      })
    ),
    temporalBound: v.optional(temporalBoundValidator),
    status: v.optional(factStatusValidator),
  },
  handler: async (
    ctx,
    {
      projectId,
      entityId,
      documentId,
      subject,
      predicate,
      object,
      confidence,
      evidenceSnippet,
      evidencePosition,
      temporalBound,
      status,
    }
  ) => {
    const userId = await requireAuth(ctx);
    const project = unwrapOrThrow(await verifyProjectAccess(ctx, projectId, userId));

    const factId = await ctx.db.insert('facts', {
      projectId,
      entityId,
      documentId,
      subject,
      predicate,
      object,
      confidence,
      evidenceSnippet,
      evidencePosition,
      temporalBound,
      status: status ?? 'pending',
      createdAt: Date.now(),
    });

    const effectiveStatus = status ?? 'pending';
    if (effectiveStatus !== 'rejected') {
      const stats = project.stats ?? {
        documentCount: 0,
        entityCount: 0,
        factCount: 0,
        alertCount: 0,
        noteCount: 0,
      };
      await ctx.db.patch(projectId, {
        updatedAt: Date.now(),
        stats: { ...stats, factCount: stats.factCount + 1 },
      });
    }

    return factId;
  },
});

export const confirm = mutation({
  args: { id: v.id('facts') },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    const fact = unwrapOrThrow(await verifyFactAccess(ctx, id, userId));

    const wasRejected = fact.status === 'rejected';

    await ctx.db.patch(id, { status: 'confirmed' });

    if (wasRejected) {
      const project = await ctx.db.get(fact.projectId);
      if (project) {
        const stats = project.stats ?? {
          documentCount: 0,
          entityCount: 0,
          factCount: 0,
          alertCount: 0,
          noteCount: 0,
        };
        await ctx.db.patch(fact.projectId, {
          updatedAt: Date.now(),
          stats: { ...stats, factCount: stats.factCount + 1 },
        });
      }
    }

    return id;
  },
});

export const reject = mutation({
  args: { id: v.id('facts') },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    const fact = unwrapOrThrow(await verifyFactAccess(ctx, id, userId));

    const wasAlreadyRejected = fact.status === 'rejected';

    await ctx.db.patch(id, { status: 'rejected' });

    if (!wasAlreadyRejected) {
      const project = await ctx.db.get(fact.projectId);
      if (project) {
        const stats = project.stats ?? {
          documentCount: 0,
          entityCount: 0,
          factCount: 0,
          alertCount: 0,
          noteCount: 0,
        };
        await ctx.db.patch(fact.projectId, {
          updatedAt: Date.now(),
          stats: { ...stats, factCount: Math.max(0, stats.factCount - 1) },
        });
      }
    }

    return id;
  },
});

export const listByEntity = query({
  args: {
    entityId: v.id('entities'),
    status: v.optional(factStatusValidator),
  },
  handler: async (ctx, { entityId, status }) => {
    const entity = await ctx.db.get(entityId);
    if (!entity) return [];

    const access = await getProjectAccess(ctx, entity.projectId);
    if (!access.canRead) return [];

    if (status) {
      return await ctx.db
        .query('facts')
        .withIndex('by_entity', (q) => q.eq('entityId', entityId).eq('status', status))
        .collect();
    }

    return await ctx.db
      .query('facts')
      .withIndex('by_entity', (q) => q.eq('entityId', entityId))
      .collect();
  },
});

export const listPending = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const access = await getProjectAccess(ctx, projectId);
    if (!access.canEdit) return [];

    return await ctx.db
      .query('facts')
      .withIndex('by_project', (q) => q.eq('projectId', projectId).eq('status', 'pending'))
      .collect();
  },
});

export const listByDocument = query({
  args: { documentId: v.id('documents') },
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc) return [];

    const access = await getProjectAccess(ctx, doc.projectId);
    if (!access.canRead) return [];

    return await ctx.db
      .query('facts')
      .withIndex('by_document', (q) => q.eq('documentId', documentId))
      .collect();
  },
});

export const listByProject = query({
  args: {
    projectId: v.id('projects'),
    status: v.optional(factStatusValidator),
  },
  handler: async (ctx, { projectId, status }) => {
    const access = await getProjectAccess(ctx, projectId);
    if (!access.canRead) return [];

    if (status) {
      return await ctx.db
        .query('facts')
        .withIndex('by_project', (q) => q.eq('projectId', projectId).eq('status', status))
        .collect();
    }

    return await ctx.db
      .query('facts')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect();
  },
});

export const listByProjectPaginated = query({
  args: {
    projectId: v.id('projects'),
    status: v.optional(factStatusValidator),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { projectId, status, paginationOpts }) => {
    const access = await getProjectAccess(ctx, projectId);
    if (!access.canRead) {
      return { page: [], isDone: true, continueCursor: '' };
    }

    if (status) {
      return await ctx.db
        .query('facts')
        .withIndex('by_project', (q) => q.eq('projectId', projectId).eq('status', status))
        .paginate(paginationOpts);
    }

    return await ctx.db
      .query('facts')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .paginate(paginationOpts);
  },
});

export const get = query({
  args: { id: v.id('facts') },
  handler: async (ctx, { id }) => {
    const fact = await ctx.db.get(id);
    if (!fact) return null;

    const access = await getProjectAccess(ctx, fact.projectId);
    if (!access.canRead) return null;

    return fact;
  },
});

export const remove = mutation({
  args: { id: v.id('facts') },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    const fact = unwrapOrThrow(await verifyFactAccess(ctx, id, userId));

    await ctx.db.delete(id);

    if (fact.status !== 'rejected') {
      const project = await ctx.db.get(fact.projectId);
      if (project) {
        const stats = project.stats ?? {
          documentCount: 0,
          entityCount: 0,
          factCount: 0,
          alertCount: 0,
          noteCount: 0,
        };
        await ctx.db.patch(fact.projectId, {
          updatedAt: Date.now(),
          stats: { ...stats, factCount: Math.max(0, stats.factCount - 1) },
        });
      }
    }

    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id('facts'),
    subject: v.optional(v.string()),
    predicate: v.optional(v.string()),
    object: v.optional(v.string()),
    confidence: v.optional(v.number()),
    evidenceSnippet: v.optional(v.string()),
    temporalBound: v.optional(temporalBoundValidator),
    status: v.optional(factStatusValidator),
  },
  handler: async (
    ctx,
    { id, subject, predicate, object, confidence, evidenceSnippet, temporalBound, status }
  ) => {
    const userId = await requireAuth(ctx);
    const fact = unwrapOrThrow(await verifyFactAccess(ctx, id, userId));

    const oldStatus = fact.status;

    await ctx.db.patch(id, {
      ...(subject !== undefined && { subject }),
      ...(predicate !== undefined && { predicate }),
      ...(object !== undefined && { object }),
      ...(confidence !== undefined && { confidence }),
      ...(evidenceSnippet !== undefined && { evidenceSnippet }),
      ...(temporalBound !== undefined && { temporalBound }),
      ...(status !== undefined && { status }),
    });

    const newStatus = status ?? oldStatus;
    const delta = (newStatus === 'rejected' ? 0 : 1) - (oldStatus === 'rejected' ? 0 : 1);

    if (status !== undefined && delta !== 0) {
      const project = await ctx.db.get(fact.projectId);
      if (project) {
        const stats = project.stats ?? {
          documentCount: 0,
          entityCount: 0,
          factCount: 0,
          alertCount: 0,
          noteCount: 0,
        };
        await ctx.db.patch(fact.projectId, {
          updatedAt: Date.now(),
          stats: { ...stats, factCount: Math.max(0, stats.factCount + delta) },
        });
      }
    }

    return id;
  },
});
