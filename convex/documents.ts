import { v } from 'convex/values';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { getAuthUserId, requireAuth } from './lib/auth';

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

export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const isOwner = await verifyProjectOwnership(ctx, projectId);
    if (!isOwner) return [];

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

    const isOwner = await verifyProjectOwnership(ctx, doc.projectId);
    if (!isOwner) return null;

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
    await requireAuth(ctx);

    const isOwner = await verifyProjectOwnership(ctx, projectId);
    if (!isOwner) {
      throw new Error('Unauthorized: Not project owner');
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
    await requireAuth(ctx);

    const doc = await ctx.db.get(id);
    if (!doc) {
      throw new Error('Document not found');
    }

    const isOwner = await verifyProjectOwnership(ctx, doc.projectId);
    if (!isOwner) {
      throw new Error('Unauthorized');
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
    await requireAuth(ctx);

    const doc = await ctx.db.get(id);
    if (!doc) {
      throw new Error('Document not found');
    }

    const isOwner = await verifyProjectOwnership(ctx, doc.projectId);
    if (!isOwner) {
      throw new Error('Unauthorized');
    }

    if (doc.storageId) {
      await ctx.storage.delete(doc.storageId);
    }

    const project = await ctx.db.get(doc.projectId);
    if (project) {
      const stats = project.stats ?? {
        documentCount: 0,
        entityCount: 0,
        factCount: 0,
        alertCount: 0,
      };
      await ctx.db.patch(doc.projectId, {
        updatedAt: Date.now(),
        stats: { ...stats, documentCount: Math.max(0, stats.documentCount - 1) },
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
    await requireAuth(ctx);

    const isOwner = await verifyProjectOwnership(ctx, projectId);
    if (!isOwner) {
      throw new Error('Unauthorized');
    }

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
    await requireAuth(ctx);

    const doc = await ctx.db.get(id);
    if (!doc) {
      throw new Error('Document not found');
    }

    const isOwner = await verifyProjectOwnership(ctx, doc.projectId);
    if (!isOwner) {
      throw new Error('Unauthorized');
    }

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
    const isOwner = await verifyProjectOwnership(ctx, projectId);
    if (!isOwner) return [];

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
    const isOwner = await verifyProjectOwnership(ctx, projectId);
    if (!isOwner) return [];

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
