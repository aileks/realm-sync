import {internalMutation} from './_generated/server';

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

    return {deleted: expiredTokens.length};
  },
});
