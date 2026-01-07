import { internalQuery, internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { checkUsageLimit } from './lib/subscription';

export const checkExtractionLimit = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return { allowed: false, reason: 'user_not_found' };

    const result = checkUsageLimit(user, 'llmExtractionsPerMonth');
    return result;
  },
});

export const incrementExtractionUsage = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return;

    const currentUsage = user.usage ?? {
      llmExtractionsThisMonth: 0,
      chatMessagesThisMonth: 0,
      usageResetAt: Date.now(),
    };

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

    const result = checkUsageLimit(user, 'chatMessagesPerMonth');
    return result;
  },
});

export const incrementChatUsage = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return;

    const currentUsage = user.usage ?? {
      llmExtractionsThisMonth: 0,
      chatMessagesThisMonth: 0,
      usageResetAt: Date.now(),
    };

    await ctx.db.patch(userId, {
      usage: {
        ...currentUsage,
        chatMessagesThisMonth: currentUsage.chatMessagesThisMonth + 1,
      },
    });
  },
});
