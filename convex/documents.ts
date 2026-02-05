import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import { requireAuth, requireAuthUser } from './lib/auth';
import { authError, limitError, notFoundError } from './lib/errors';
import { canReadProject, canEditProject } from './lib/projectAccess';
import { assertStorageIdAvailableForDocument } from './lib/storageAccess';
import { getDocumentCount, checkResourceLimit } from './lib/subscription';

const contentTypeValidator = v.union(v.literal('text'), v.literal('markdown'), v.literal('file'));

const processingStatusValidator = v.union(
  v.literal('pending'),
  v.literal('processing'),
  v.literal('completed'),
  v.literal('failed')
);

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function requireProjectOwnership(
  ctx: MutationCtx,
  projectId: Id<'projects'>,
  userId: Id<'users'>
): Promise<Doc<'projects'>> {
  const project = await ctx.db.get(projectId);
  if (!project) {
    throw notFoundError('project', projectId);
  }
  if (project.userId !== userId) {
    throw authError('unauthorized', 'You do not have permission to access this project.');
  }
  return project;
}

async function requireDocumentAccess(
  ctx: MutationCtx,
  documentId: Id<'documents'>,
  userId: Id<'users'>
): Promise<Doc<'documents'>> {
  const doc = await ctx.db.get(documentId);
  if (!doc) {
    throw notFoundError('document', documentId);
  }
  await requireProjectOwnership(ctx, doc.projectId, userId);
  return doc;
}

export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const canRead = await canReadProject(ctx, projectId);
    if (!canRead) return [];

    return await ctx.db
      .query('documents')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id('documents') },
  handler: async (ctx, { id }) => {
    const doc = await ctx.db.get(id);
    if (!doc) return null;

    const canRead = await canReadProject(ctx, doc.projectId);
    if (!canRead) return null;

    return doc;
  },
});

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    title: v.string(),
    content: v.optional(v.string()),
    storageId: v.optional(v.id('_storage')),
    contentType: contentTypeValidator,
  },
  handler: async (ctx, { projectId, title, content, storageId, contentType }) => {
    const user = await requireAuthUser(ctx);
    await requireProjectOwnership(ctx, projectId, user._id);

    if (storageId) {
      await assertStorageIdAvailableForDocument(ctx, storageId);
    }

    const docCount = await getDocumentCount(ctx, projectId);
    const limitCheck = checkResourceLimit(user, 'documentsPerProject', docCount);

    if (!limitCheck.allowed) {
      throw limitError(
        'documentsPerProject',
        limitCheck.limit,
        `Document limit reached. Free tier allows ${limitCheck.limit} documents per project. Upgrade to Realm Unlimited for unlimited documents.`
      );
    }

    const existingDocs = await ctx.db
      .query('documents')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect();

    const maxOrderIndex = existingDocs.reduce((max, doc) => Math.max(max, doc.orderIndex), -1);

    const wordCount = content ? countWords(content) : 0;
    const now = Date.now();

    const docId = await ctx.db.insert('documents', {
      projectId,
      title,
      content,
      storageId,
      contentType,
      orderIndex: maxOrderIndex + 1,
      wordCount,
      createdAt: now,
      updatedAt: now,
      processingStatus: 'pending',
    });

    const project = await ctx.db.get(projectId);
    if (project) {
      const stats = project.stats ?? {
        documentCount: 0,
        entityCount: 0,
        factCount: 0,
        alertCount: 0,
        noteCount: 0,
      };
      await ctx.db.patch(projectId, {
        updatedAt: now,
        stats: { ...stats, documentCount: stats.documentCount + 1 },
      });
    }

    return docId;
  },
});

export const update = mutation({
  args: {
    id: v.id('documents'),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    storageId: v.optional(v.id('_storage')),
    contentType: v.optional(contentTypeValidator),
  },
  handler: async (ctx, { id, title, content, storageId, contentType }) => {
    const userId = await requireAuth(ctx);
    const doc = await requireDocumentAccess(ctx, id, userId);

    if (storageId && storageId !== doc.storageId) {
      await assertStorageIdAvailableForDocument(ctx, storageId, doc._id);
    }

    await ctx.db.patch(id, {
      updatedAt: Date.now(),
      ...(title !== undefined && { title }),
      ...(content !== undefined && {
        content,
        wordCount: countWords(content),
        processingStatus: 'pending' as const,
      }),
      ...(storageId !== undefined && { storageId }),
      ...(contentType !== undefined && { contentType }),
    });

    return id;
  },
});

export const remove = mutation({
  args: { id: v.id('documents') },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    const doc = await requireDocumentAccess(ctx, id, userId);

    if (doc.storageId) {
      await ctx.storage.delete(doc.storageId);
    }

    const facts = await ctx.db
      .query('facts')
      .withIndex('by_document', (q) => q.eq('documentId', id))
      .collect();
    const removedFactIds = new Set(facts.map((fact) => fact._id));
    const removedNonRejectedFacts = facts.filter((fact) => fact.status !== 'rejected').length;

    for (const fact of facts) {
      await ctx.db.delete(fact._id);
    }

    const alertStatuses = ['open', 'resolved', 'dismissed'] as const;
    const alertsByStatus = await Promise.all(
      alertStatuses.map(async (status) => {
        return await ctx.db
          .query('alerts')
          .withIndex('by_project', (q) => q.eq('projectId', doc.projectId).eq('status', status))
          .collect();
      })
    );
    const alerts = alertsByStatus.flat();

    let removedOpenAlerts = 0;
    for (const alert of alerts) {
      const referencesRemovedFact = alert.factIds.some((factId) => removedFactIds.has(factId));
      if (alert.documentId !== id && !referencesRemovedFact) continue;

      if (alert.status === 'open') {
        removedOpenAlerts++;
      }
      await ctx.db.delete(alert._id);
    }

    const project = await ctx.db.get(doc.projectId);
    if (project) {
      const stats = project.stats ?? {
        documentCount: 0,
        entityCount: 0,
        factCount: 0,
        alertCount: 0,
        noteCount: 0,
      };
      await ctx.db.patch(doc.projectId, {
        updatedAt: Date.now(),
        stats: {
          ...stats,
          documentCount: Math.max(0, stats.documentCount - 1),
          factCount: Math.max(0, stats.factCount - removedNonRejectedFacts),
          alertCount: Math.max(0, stats.alertCount - removedOpenAlerts),
        },
      });
    }

    await ctx.db.delete(id);
    return id;
  },
});

export const reorder = mutation({
  args: {
    projectId: v.id('projects'),
    documentIds: v.array(v.id('documents')),
  },
  handler: async (ctx, { projectId, documentIds }) => {
    const userId = await requireAuth(ctx);
    await requireProjectOwnership(ctx, projectId, userId);

    for (let i = 0; i < documentIds.length; i++) {
      await ctx.db.patch(documentIds[i], { orderIndex: i });
    }

    await ctx.db.patch(projectId, { updatedAt: Date.now() });
  },
});

export const updateProcessingStatus = mutation({
  args: {
    id: v.id('documents'),
    status: processingStatusValidator,
  },
  handler: async (ctx, { id, status }) => {
    const userId = await requireAuth(ctx);
    await requireDocumentAccess(ctx, id, userId);

    await ctx.db.patch(id, {
      processingStatus: status,
      updatedAt: Date.now(),
      ...(status === 'completed' && { processedAt: Date.now() }),
    });
  },
});

export const search = query({
  args: {
    projectId: v.id('projects'),
    query: v.string(),
  },
  handler: async (ctx, { projectId, query: searchQuery }) => {
    const canRead = await canReadProject(ctx, projectId);
    if (!canRead) return [];

    return await ctx.db
      .query('documents')
      .withSearchIndex('search_content', (q) =>
        q.search('content', searchQuery).eq('projectId', projectId)
      )
      .collect();
  },
});

export const listNeedingReview = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const canEdit = await canEditProject(ctx, projectId);
    if (!canEdit) return [];

    const completedDocs = await ctx.db
      .query('documents')
      .withIndex('by_project_status', (q) =>
        q.eq('projectId', projectId).eq('processingStatus', 'completed')
      )
      .collect();

    const docsWithPendingItems = [];

    for (const doc of completedDocs) {
      const pendingEntities = await ctx.db
        .query('entities')
        .withIndex('by_project_status', (q) => q.eq('projectId', projectId).eq('status', 'pending'))
        .filter((q) => q.eq(q.field('firstMentionedIn'), doc._id))
        .collect();

      const pendingFacts = await ctx.db
        .query('facts')
        .withIndex('by_document', (q) => q.eq('documentId', doc._id))
        .filter((q) => q.eq(q.field('status'), 'pending'))
        .collect();

      if (pendingEntities.length > 0 || pendingFacts.length > 0) {
        docsWithPendingItems.push({
          ...doc,
          pendingEntityCount: pendingEntities.length,
          pendingFactCount: pendingFacts.length,
        });
      }
    }

    return docsWithPendingItems;
  },
});
