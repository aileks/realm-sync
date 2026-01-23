import { internalMutation } from './_generated/server';

export const cleanupExpiredRefreshTokens = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const expiredTokens = await ctx.db
      .query('authRefreshTokens')
      .filter((q) => q.lt(q.field('expirationTime'), now))
      .collect();

    for (const token of expiredTokens) {
      await ctx.db.delete(token._id);
    }

    return { deleted: expiredTokens.length };
  },
});

export const cleanupExpiredChatStreams = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const expiredStreams = await ctx.db
      .query('chatStreams')
      .withIndex('by_expires_at', (q) => q.lte('expiresAt', now))
      .collect();

    for (const stream of expiredStreams) {
      await ctx.db.delete(stream._id);
    }

    return { deleted: expiredStreams.length };
  },
});
