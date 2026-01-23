import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { requireAuthUser } from './auth';

type StorageAccess = {
  user: Doc<'users'>;
  document?: Doc<'documents'>;
};

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
    throw new Error('File not found');
  }

  const project = await ctx.db.get(document.projectId);
  if (!project || project.userId !== user._id) {
    throw new Error('Unauthorized');
  }

  return { user, document };
}
