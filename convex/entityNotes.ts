import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import { requireAuth } from './lib/auth';
import { authError, notFoundError } from './lib/errors';
import { canReadProject } from './lib/projectAccess';

async function requireEntityOwnership(
  ctx: MutationCtx,
  entityId: Id<'entities'>,
  userId: Id<'users'>
): Promise<Doc<'entities'>> {
  const entity = await ctx.db.get(entityId);
  if (!entity) {
    throw notFoundError('entity', entityId);
  }
  const project = await ctx.db.get(entity.projectId);
  if (!project) {
    throw notFoundError('project', entity.projectId);
  }
  if (project.userId !== userId) {
    throw authError('unauthorized', 'You do not have permission to access this entity.');
  }
  return entity;
}

async function requireEntityNoteAccess(
  ctx: MutationCtx,
  noteId: Id<'entityNotes'>,
  userId: Id<'users'>
): Promise<Doc<'entityNotes'>> {
  const note = await ctx.db.get(noteId);
  if (!note) {
    throw notFoundError('entityNote', noteId);
  }
  await requireEntityOwnership(ctx, note.entityId, userId);
  return note;
}

async function canReadEntity(ctx: QueryCtx, entityId: Id<'entities'>): Promise<boolean> {
  const entity = await ctx.db.get(entityId);
  if (!entity) return false;
  return canReadProject(ctx, entity.projectId);
}

export const list = query({
  args: { entityId: v.id('entities') },
  handler: async (ctx, { entityId }) => {
    const canRead = await canReadEntity(ctx, entityId);
    if (!canRead) return [];

    return await ctx.db
      .query('entityNotes')
      .withIndex('by_entity', (q) => q.eq('entityId', entityId))
      .order('desc')
      .collect();
  },
});

export const get = query({
  args: { id: v.id('entityNotes') },
  handler: async (ctx, { id }) => {
    const note = await ctx.db.get(id);
    if (!note) return null;

    const canRead = await canReadEntity(ctx, note.entityId);
    if (!canRead) return null;

    return note;
  },
});

export const create = mutation({
  args: {
    entityId: v.id('entities'),
    content: v.string(),
  },
  handler: async (ctx, { entityId, content }) => {
    const userId = await requireAuth(ctx);
    const entity = await requireEntityOwnership(ctx, entityId, userId);

    const now = Date.now();

    const noteId = await ctx.db.insert('entityNotes', {
      entityId,
      projectId: entity.projectId,
      userId,
      content,
      createdAt: now,
      updatedAt: now,
    });

    return noteId;
  },
});

export const update = mutation({
  args: {
    id: v.id('entityNotes'),
    content: v.string(),
  },
  handler: async (ctx, { id, content }) => {
    const userId = await requireAuth(ctx);
    await requireEntityNoteAccess(ctx, id, userId);

    await ctx.db.patch(id, {
      content,
      updatedAt: Date.now(),
    });

    return id;
  },
});

export const remove = mutation({
  args: { id: v.id('entityNotes') },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    await requireEntityNoteAccess(ctx, id, userId);

    await ctx.db.delete(id);
    return id;
  },
});
