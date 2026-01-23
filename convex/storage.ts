import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireAuth } from './lib/auth';
import { requireStorageAccess } from './lib/storageAccess';

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getFileUrl = query({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, { storageId }) => {
    await requireStorageAccess(ctx, storageId);
    return await ctx.storage.getUrl(storageId);
  },
});

export const deleteFile = mutation({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, { storageId }) => {
    const { user, document } = await requireStorageAccess(ctx, storageId);
    await ctx.storage.delete(storageId);
    if (document) {
      await ctx.db.patch(document._id, { storageId: undefined });
    }
    if (user.avatarStorageId === storageId) {
      await ctx.db.patch(user._id, { avatarStorageId: undefined });
    }
  },
});

export const getFileMetadata = query({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, { storageId }) => {
    await requireStorageAccess(ctx, storageId);
    return await ctx.db.system.get(storageId);
  },
});
