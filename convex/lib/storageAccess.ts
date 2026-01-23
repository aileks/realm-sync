import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { requireAuthUser } from './auth';
import { authError, conflictError, notFoundError } from './errors';

type StorageAccess = {
  user: Doc<'users'>;
  document?: Doc<'documents'>;
};

function storageIdConflict() {
  throw conflictError('File already in use');
}

export async function assertStorageIdAvailableForAvatar(
  ctx: QueryCtx | MutationCtx,
  storageId: Id<'_storage'>,
  userId: Id<'users'>
): Promise<void> {
  const avatarOwner = await ctx.db
    .query('users')
    .withIndex('by_avatar_storage', (q) => q.eq('avatarStorageId', storageId))
    .first();

  if (avatarOwner && avatarOwner._id !== userId) {
    storageIdConflict();
  }

  const document = await ctx.db
    .query('documents')
    .withIndex('by_storage', (q) => q.eq('storageId', storageId))
    .first();

  if (document) {
    storageIdConflict();
  }
}

export async function assertStorageIdAvailableForDocument(
  ctx: QueryCtx | MutationCtx,
  storageId: Id<'_storage'>,
  ignoreDocumentId?: Id<'documents'>
): Promise<void> {
  const avatarOwner = await ctx.db
    .query('users')
    .withIndex('by_avatar_storage', (q) => q.eq('avatarStorageId', storageId))
    .first();

  if (avatarOwner) {
    storageIdConflict();
  }

  const documents = await ctx.db
    .query('documents')
    .withIndex('by_storage', (q) => q.eq('storageId', storageId))
    .collect();

  const conflict = documents.find((doc) => doc._id !== ignoreDocumentId);
  if (conflict) {
    storageIdConflict();
  }
}

export async function requireStorageAccess(
  ctx: QueryCtx | MutationCtx,
  storageId: Id<'_storage'>
): Promise<StorageAccess> {
  const user = await requireAuthUser(ctx);

  if (user.avatarStorageId === storageId) {
    return { user };
  }

  const document = await ctx.db
    .query('documents')
    .withIndex('by_storage', (q) => q.eq('storageId', storageId))
    .first();

  if (!document) {
    throw notFoundError('file', storageId);
  }

  const project = await ctx.db.get(document.projectId);
  if (!project || project.userId !== user._id) {
    throw authError('unauthorized', 'You do not have permission to access this file.');
  }

  return { user, document };
}
