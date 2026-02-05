import { internalQuery, internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { checkUsageLimit, shouldResetUsage } from './lib/subscription';

export const checkExtractionLimit = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return { allowed: false, reason: 'user_not_found' };

    const userForLimit =
      shouldResetUsage(user) ?
        {
          ...user,
          usage: {
            llmExtractionsThisMonth: 0,
            chatMessagesThisMonth: 0,
            usageResetAt: Date.now(),
          },
        }
      : user;
    const result = checkUsageLimit(userForLimit, 'llmExtractionsPerMonth');
    return result;
  },
});

export const incrementExtractionUsage = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return;

    const now = Date.now();
    const currentUsage =
      !user.usage || shouldResetUsage(user) ?
        {
          llmExtractionsThisMonth: 0,
          chatMessagesThisMonth: 0,
          usageResetAt: now,
        }
      : user.usage;

    await ctx.db.patch(userId, {
      usage: {
        ...currentUsage,
        llmExtractionsThisMonth: currentUsage.llmExtractionsThisMonth + 1,
      },
    });
  },
});

export const checkChatLimit = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return { allowed: false, reason: 'user_not_found' };

    const userForLimit =
      shouldResetUsage(user) ?
        {
          ...user,
          usage: {
            llmExtractionsThisMonth: 0,
            chatMessagesThisMonth: 0,
            usageResetAt: Date.now(),
          },
        }
      : user;
    const result = checkUsageLimit(userForLimit, 'chatMessagesPerMonth');
    return result;
  },
});

export const incrementChatUsage = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return;

    const now = Date.now();
    const currentUsage =
      !user.usage || shouldResetUsage(user) ?
        {
          llmExtractionsThisMonth: 0,
          chatMessagesThisMonth: 0,
          usageResetAt: now,
        }
      : user.usage;

    await ctx.db.patch(userId, {
      usage: {
        ...currentUsage,
        chatMessagesThisMonth: currentUsage.chatMessagesThisMonth + 1,
      },
    });
  },
});

export const resetStaleUsageCounters = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect();
    let resetCount = 0;

    for (const user of users) {
      if (!user.usage || !shouldResetUsage(user)) continue;

      await ctx.db.patch(user._id, {
        usage: {
          llmExtractionsThisMonth: 0,
          chatMessagesThisMonth: 0,
          usageResetAt: Date.now(),
        },
      });
      resetCount++;
    }

    return { resetCount };
  },
});
