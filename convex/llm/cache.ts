import { internalQuery, internalMutation } from '../_generated/server';
import { v } from 'convex/values';

export const checkCache = internalQuery({
  args: {
    inputHash: v.string(),
    promptVersion: v.string(),
  },
  handler: async (ctx, { inputHash, promptVersion }) => {
    const cache = await ctx.db
      .query('llmCache')
      .withIndex('by_hash', (q) => q.eq('inputHash', inputHash).eq('promptVersion', promptVersion))
      .first();

    if (!cache || cache.expiresAt < Date.now()) {
      return null;
    }

    return cache;
  },
});

export const saveToCache = internalMutation({
  args: {
    inputHash: v.string(),
    promptVersion: v.string(),
    modelId: v.string(),
    response: v.any(),
  },
  handler: async (ctx, { inputHash, promptVersion, modelId, response }) => {
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const createdAt = Date.now();

    return await ctx.db.insert('llmCache', {
      inputHash,
      promptVersion,
      modelId,
      response: JSON.stringify(response),
      createdAt,
      expiresAt,
    });
  },
});

export const invalidateCache = internalMutation({
  args: {
    promptVersion: v.string(),
    inputHash: v.optional(v.string()),
  },
  handler: async (ctx, { promptVersion, inputHash }) => {
    if (inputHash) {
      const caches = await ctx.db
        .query('llmCache')
        .withIndex('by_hash', (q) =>
          q.eq('inputHash', inputHash).eq('promptVersion', promptVersion)
        )
        .collect();

      for (const cache of caches) {
        await ctx.db.delete(cache._id);
      }
    } else {
      const caches = await ctx.db
        .query('llmCache')
        .filter((q) => q.eq(q.field('promptVersion'), promptVersion))
        .collect();

      for (const cache of caches) {
        await ctx.db.delete(cache._id);
      }
    }
  },
});
