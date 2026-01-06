import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId, requireAuth } from './lib/auth';

export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 50 }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query('chatMessages')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('asc')
      .take(limit);
  },
});

export const send = mutation({
  args: {
    role: v.union(v.literal('user'), v.literal('assistant')),
    content: v.string(),
  },
  handler: async (ctx, { role, content }) => {
    const userId = await requireAuth(ctx);

    return await ctx.db.insert('chatMessages', {
      userId,
      role,
      content,
      createdAt: Date.now(),
    });
  },
});

export const clear = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);

    const messages = await ctx.db
      .query('chatMessages')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    await Promise.all(messages.map((msg) => ctx.db.delete(msg._id)));

    return { deleted: messages.length };
  },
});
