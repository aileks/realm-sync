import { v } from 'convex/values';
import { mutation, query, internalMutation, internalQuery } from './_generated/server';
import { requireAuth, requireAuthUser } from './lib/auth';
import {
  getUserTier,
  isTrialActive,
  isTrialExpired,
  shouldResetUsage,
  getProjectCount,
  checkResourceLimit,
  checkUsageLimit,
} from './lib/subscription';
import {
  TRIAL_DURATION_MS,
  SUBSCRIPTION_PRICE_DISPLAY,
  SUBSCRIPTION_TIER_NAME,
  getLimit,
} from './lib/limits';

export const getSubscription = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);

    const tier = getUserTier(user);
    const trialActive = isTrialActive(user);
    const trialExpired = isTrialExpired(user);

    const projectCount = await getProjectCount(ctx, user._id);

    const usageNeedsReset = shouldResetUsage(user);
    const usage =
      usageNeedsReset ?
        { llmExtractionsThisMonth: 0, chatMessagesThisMonth: 0, usageResetAt: Date.now() }
      : (user.usage ?? {
          llmExtractionsThisMonth: 0,
          chatMessagesThisMonth: 0,
          usageResetAt: Date.now(),
        });

    return {
      tier,
      status: user.subscriptionStatus ?? 'free',
      trialActive,
      trialExpired,
      trialEndsAt: user.trialEndsAt,
      polarCustomerId: user.polarCustomerId,
      polarSubscriptionId: user.polarSubscriptionId,
      usage: {
        projects: {
          current: projectCount,
          limit: getLimit(tier, 'projects'),
        },
        llmExtractions: {
          current: usage.llmExtractionsThisMonth,
          limit: getLimit(tier, 'llmExtractionsPerMonth'),
        },
        chatMessages: {
          current: usage.chatMessagesThisMonth,
          limit: getLimit(tier, 'chatMessagesPerMonth'),
        },
        resetAt: usage.usageResetAt,
      },
      pricing: {
        amount: SUBSCRIPTION_PRICE_DISPLAY,
        tierName: SUBSCRIPTION_TIER_NAME,
      },
    };
  },
});

export const startTrial = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new Error('User not found');

    if (user.subscriptionTier === 'unlimited' && user.subscriptionStatus === 'active') {
      throw new Error('Already subscribed to Realm Unlimited');
    }

    if (user.trialEndsAt) {
      throw new Error('Trial already used');
    }

    const trialEndsAt = Date.now() + TRIAL_DURATION_MS;

    await ctx.db.patch(userId, {
      subscriptionTier: 'unlimited',
      subscriptionStatus: 'trialing',
      trialEndsAt,
    });

    return { trialEndsAt };
  },
});

export const getUsageStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);

    const tier = getUserTier(user);
    const projectCount = await getProjectCount(ctx, user._id);

    const projectsCheck = checkResourceLimit(user, 'projects', projectCount);
    const extractionsCheck = checkUsageLimit(user, 'llmExtractionsPerMonth');
    const chatCheck = checkUsageLimit(user, 'chatMessagesPerMonth');

    return {
      tier,
      projects: projectsCheck,
      llmExtractions: extractionsCheck,
      chatMessages: chatCheck,
    };
  },
});

export const handleSubscriptionActivated = mutation({
  args: {
    polarCustomerId: v.string(),
    polarSubscriptionId: v.string(),
    userId: v.id('users'),
  },
  handler: async (ctx, { polarCustomerId, polarSubscriptionId, userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error('User not found');

    await ctx.db.patch(userId, {
      subscriptionTier: 'unlimited',
      subscriptionStatus: 'active',
      polarCustomerId,
      polarSubscriptionId,
    });

    return userId;
  },
});

export const handleSubscriptionCanceled = mutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error('User not found');

    await ctx.db.patch(userId, {
      subscriptionTier: 'free',
      subscriptionStatus: 'canceled',
    });

    return userId;
  },
});

export const expireTrials = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const users = await ctx.db.query('users').collect();

    let expiredCount = 0;
    for (const user of users) {
      if (user.subscriptionStatus === 'trialing' && user.trialEndsAt && now >= user.trialEndsAt) {
        await ctx.db.patch(user._id, {
          subscriptionTier: 'free',
          subscriptionStatus: 'canceled',
        });
        expiredCount++;
      }
    }

    return { expiredCount };
  },
});

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
