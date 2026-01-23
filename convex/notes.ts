import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import { requireAuth } from './lib/auth';
import { authError, notFoundError } from './lib/errors';
import { canReadProject } from './lib/projectAccess';

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

async function requireNoteAccess(
  ctx: MutationCtx,
  noteId: Id<'notes'>,
  userId: Id<'users'>
): Promise<Doc<'notes'>> {
  const note = await ctx.db.get(noteId);
  if (!note) {
    throw notFoundError('note', noteId);
  }
  await requireProjectOwnership(ctx, note.projectId, userId);
  return note;
}

export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const canRead = await canReadProject(ctx, projectId);
    if (!canRead) return [];

    return await ctx.db
      .query('notes')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .order('desc')
      .collect();
  },
});

export const listPaginated = query({
  args: {
    projectId: v.id('projects'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { projectId, paginationOpts }) => {
    const canRead = await canReadProject(ctx, projectId);
    if (!canRead) {
      return { page: [], isDone: true, continueCursor: '' };
    }

    return await ctx.db
      .query('notes')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .order('desc')
      .paginate(paginationOpts);
  },
});

export const get = query({
  args: { id: v.id('notes') },
  handler: async (ctx, { id }) => {
    const note = await ctx.db.get(id);
    if (!note) return null;

    const canRead = await canReadProject(ctx, note.projectId);
    if (!canRead) return null;

    return note;
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
      .query('notes')
      .withSearchIndex('search_content', (q) =>
        q.search('content', searchQuery).eq('projectId', projectId)
      )
      .collect();
  },
});

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    title: v.string(),
    content: v.string(),
    tags: v.optional(v.array(v.string())),
    pinned: v.optional(v.boolean()),
  },
  handler: async (ctx, { projectId, title, content, tags, pinned }) => {
    const userId = await requireAuth(ctx);
    await requireProjectOwnership(ctx, projectId, userId);

    const now = Date.now();

    const noteId = await ctx.db.insert('notes', {
      projectId,
      userId,
      title,
      content,
      tags: tags ?? [],
      pinned: pinned ?? false,
      createdAt: now,
      updatedAt: now,
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
        stats: { ...stats, noteCount: (stats.noteCount ?? 0) + 1 },
      });
    }

    return noteId;
  },
});

export const update = mutation({
  args: {
    id: v.id('notes'),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    pinned: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, title, content, tags, pinned }) => {
    const userId = await requireAuth(ctx);
    await requireNoteAccess(ctx, id, userId);

    await ctx.db.patch(id, {
      updatedAt: Date.now(),
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(tags !== undefined && { tags }),
      ...(pinned !== undefined && { pinned }),
    });

    return id;
  },
});

export const remove = mutation({
  args: { id: v.id('notes') },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    const note = await requireNoteAccess(ctx, id, userId);

    const project = await ctx.db.get(note.projectId);
    if (project) {
      const stats = project.stats ?? {
        documentCount: 0,
        entityCount: 0,
        factCount: 0,
        alertCount: 0,
        noteCount: 0,
      };
      await ctx.db.patch(note.projectId, {
        updatedAt: Date.now(),
        stats: { ...stats, noteCount: Math.max(0, (stats.noteCount ?? 0) - 1) },
      });
    }

    await ctx.db.delete(id);
    return id;
  },
});

export const togglePin = mutation({
  args: { id: v.id('notes') },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    const note = await requireNoteAccess(ctx, id, userId);

    await ctx.db.patch(id, {
      pinned: !note.pinned,
      updatedAt: Date.now(),
    });

    return id;
  },
});
