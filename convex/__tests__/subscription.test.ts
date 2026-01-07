import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { api } from '../_generated/api';
import schema from '../schema';
import {
  getUserTier,
  isTrialActive,
  isTrialExpired,
  shouldResetUsage,
  checkUsageLimit,
  checkResourceLimit,
} from '../lib/subscription';
import { getLimit, MONTHLY_RESET_INTERVAL_MS } from '../lib/limits';
import type { Doc } from '../_generated/dataModel';

const getModules = () => import.meta.glob('../**/*.ts');

function createMockUser(overrides: Partial<Doc<'users'>> = {}): Doc<'users'> {
  return {
    _id: 'test_user_id' as Doc<'users'>['_id'],
    _creationTime: Date.now(),
    createdAt: Date.now(),
    ...overrides,
  } as Doc<'users'>;
}

async function setupAuthenticatedUser(
  t: ReturnType<typeof convexTest>,
  userOverrides: Partial<Doc<'users'>> = {}
) {
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      name: 'Test User',
      email: 'test@example.com',
      createdAt: Date.now(),
      ...userOverrides,
    });
  });

  const asUser = t.withIdentity({ subject: userId });
  return { userId, asUser };
}

describe('subscription lib functions', () => {
  describe('getUserTier', () => {
    it('returns free for new users with no subscription', () => {
      const user = createMockUser();
      expect(getUserTier(user)).toBe('free');
    });

    it('returns free when subscriptionTier is free', () => {
      const user = createMockUser({ subscriptionTier: 'free' });
      expect(getUserTier(user)).toBe('free');
    });

    it('returns unlimited when tier is unlimited and status is active', () => {
      const user = createMockUser({
        subscriptionTier: 'unlimited',
        subscriptionStatus: 'active',
      });
      expect(getUserTier(user)).toBe('unlimited');
    });

    it('returns unlimited when tier is unlimited and status is trialing', () => {
      const user = createMockUser({
        subscriptionTier: 'unlimited',
        subscriptionStatus: 'trialing',
      });
      expect(getUserTier(user)).toBe('unlimited');
    });

    it('returns free when tier is unlimited but status is canceled', () => {
      const user = createMockUser({
        subscriptionTier: 'unlimited',
        subscriptionStatus: 'canceled',
      });
      expect(getUserTier(user)).toBe('free');
    });

    it('returns free when tier is unlimited but status is past_due', () => {
      const user = createMockUser({
        subscriptionTier: 'unlimited',
        subscriptionStatus: 'past_due',
      });
      expect(getUserTier(user)).toBe('free');
    });
  });

  describe('isTrialActive', () => {
    it('returns false when not trialing', () => {
      const user = createMockUser({ subscriptionStatus: 'active' });
      expect(isTrialActive(user)).toBe(false);
    });

    it('returns false when trialing but no trialEndsAt', () => {
      const user = createMockUser({ subscriptionStatus: 'trialing' });
      expect(isTrialActive(user)).toBe(false);
    });

    it('returns true when trialing and trial has not expired', () => {
      const user = createMockUser({
        subscriptionStatus: 'trialing',
        trialEndsAt: Date.now() + 1000000,
      });
      expect(isTrialActive(user)).toBe(true);
    });

    it('returns false when trialing and trial has expired', () => {
      const user = createMockUser({
        subscriptionStatus: 'trialing',
        trialEndsAt: Date.now() - 1000,
      });
      expect(isTrialActive(user)).toBe(false);
    });
  });

  describe('isTrialExpired', () => {
    it('returns false when no trialEndsAt', () => {
      const user = createMockUser();
      expect(isTrialExpired(user)).toBe(false);
    });

    it('returns false when trial is still active', () => {
      const user = createMockUser({
        subscriptionStatus: 'trialing',
        trialEndsAt: Date.now() + 1000000,
      });
      expect(isTrialExpired(user)).toBe(false);
    });

    it('returns true when trial has expired and status is still trialing', () => {
      const user = createMockUser({
        subscriptionStatus: 'trialing',
        trialEndsAt: Date.now() - 1000,
      });
      expect(isTrialExpired(user)).toBe(true);
    });

    it('returns false when trial expired but status is active (converted)', () => {
      const user = createMockUser({
        subscriptionStatus: 'active',
        trialEndsAt: Date.now() - 1000,
      });
      expect(isTrialExpired(user)).toBe(false);
    });
  });

  describe('shouldResetUsage', () => {
    it('returns true when no usage data exists', () => {
      const user = createMockUser();
      expect(shouldResetUsage(user)).toBe(true);
    });

    it('returns false when usage was reset recently', () => {
      const user = createMockUser({
        usage: {
          llmExtractionsThisMonth: 5,
          chatMessagesThisMonth: 10,
          usageResetAt: Date.now(),
        },
      });
      expect(shouldResetUsage(user)).toBe(false);
    });

    it('returns true when usage reset was more than 30 days ago', () => {
      const user = createMockUser({
        usage: {
          llmExtractionsThisMonth: 5,
          chatMessagesThisMonth: 10,
          usageResetAt: Date.now() - MONTHLY_RESET_INTERVAL_MS - 1000,
        },
      });
      expect(shouldResetUsage(user)).toBe(true);
    });
  });

  describe('checkUsageLimit', () => {
    it('allows free user under extraction limit', () => {
      const user = createMockUser({
        usage: {
          llmExtractionsThisMonth: 5,
          chatMessagesThisMonth: 0,
          usageResetAt: Date.now(),
        },
      });
      const result = checkUsageLimit(user, 'llmExtractionsPerMonth');
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(5);
      expect(result.limit).toBe(20);
    });

    it('warns free user at 80% extraction limit', () => {
      const user = createMockUser({
        usage: {
          llmExtractionsThisMonth: 16,
          chatMessagesThisMonth: 0,
          usageResetAt: Date.now(),
        },
      });
      const result = checkUsageLimit(user, 'llmExtractionsPerMonth');
      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.warning).toBe(true);
      }
    });

    it('blocks free user at extraction limit', () => {
      const user = createMockUser({
        usage: {
          llmExtractionsThisMonth: 20,
          chatMessagesThisMonth: 0,
          usageResetAt: Date.now(),
        },
      });
      const result = checkUsageLimit(user, 'llmExtractionsPerMonth');
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toBe('limit_exceeded');
      }
    });

    it('allows unlimited user with any usage', () => {
      const user = createMockUser({
        subscriptionTier: 'unlimited',
        subscriptionStatus: 'active',
        usage: {
          llmExtractionsThisMonth: 1000,
          chatMessagesThisMonth: 0,
          usageResetAt: Date.now(),
        },
      });
      const result = checkUsageLimit(user, 'llmExtractionsPerMonth');
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(Infinity);
    });

    it('checks chat message limits correctly', () => {
      const user = createMockUser({
        usage: {
          llmExtractionsThisMonth: 0,
          chatMessagesThisMonth: 50,
          usageResetAt: Date.now(),
        },
      });
      const result = checkUsageLimit(user, 'chatMessagesPerMonth');
      expect(result.allowed).toBe(false);
    });
  });

  describe('checkResourceLimit', () => {
    it('allows free user under project limit', () => {
      const user = createMockUser();
      const result = checkResourceLimit(user, 'projects', 2);
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(2);
      expect(result.limit).toBe(3);
    });

    it('warns free user at 80% project limit', () => {
      const user = createMockUser();
      const result = checkResourceLimit(user, 'projects', 3);
      expect(result.allowed).toBe(false);
    });

    it('blocks free user at project limit', () => {
      const user = createMockUser();
      const result = checkResourceLimit(user, 'projects', 3);
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toBe('limit_exceeded');
      }
    });

    it('allows unlimited user with any project count', () => {
      const user = createMockUser({
        subscriptionTier: 'unlimited',
        subscriptionStatus: 'active',
      });
      const result = checkResourceLimit(user, 'projects', 100);
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(Infinity);
    });

    it('checks document per project limits correctly', () => {
      const user = createMockUser();
      const result = checkResourceLimit(user, 'documentsPerProject', 10);
      expect(result.allowed).toBe(false);
    });

    it('checks entity per project limits correctly', () => {
      const user = createMockUser();
      const result = checkResourceLimit(user, 'entitiesPerProject', 50);
      expect(result.allowed).toBe(false);
    });
  });
});

describe('subscription mutations/queries', () => {
  describe('getSubscription', () => {
    it('returns subscription info for authenticated user', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const subscription = await asUser.query(api.subscription.getSubscription, {});
      expect(subscription).not.toBeNull();
      expect(subscription?.tier).toBe('free');
      expect(subscription?.usage.projects.limit).toBe(3);
    });
  });

  describe('startTrial', () => {
    it('starts 7-day trial for new user', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const result = await asUser.mutation(api.subscription.startTrial, {});
      expect(result.trialEndsAt).toBeGreaterThan(Date.now());

      const user = await t.run(async (ctx) => ctx.db.get(userId));
      expect(user?.subscriptionTier).toBe('unlimited');
      expect(user?.subscriptionStatus).toBe('trialing');
    });

    it('throws if user already has active subscription', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t, {
        subscriptionTier: 'unlimited',
        subscriptionStatus: 'active',
      });

      await expect(asUser.mutation(api.subscription.startTrial, {})).rejects.toThrow(
        'Already subscribed'
      );
    });

    it('throws if user already used trial', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t, {
        trialEndsAt: Date.now() - 1000,
      });

      await expect(asUser.mutation(api.subscription.startTrial, {})).rejects.toThrow(
        'Trial already used'
      );
    });
  });

  describe('getUsageStats', () => {
    it('returns usage stats for authenticated user', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const stats = await asUser.query(api.subscription.getUsageStats, {});
      expect(stats.tier).toBe('free');
      expect(stats.projects.allowed).toBe(true);
      expect(stats.llmExtractions.allowed).toBe(true);
      expect(stats.chatMessages.allowed).toBe(true);
    });
  });

  describe('handleSubscriptionActivated', () => {
    it('upgrades user to unlimited tier', async () => {
      const t = convexTest(schema, getModules());
      const { userId } = await setupAuthenticatedUser(t);

      await t.mutation(api.subscription.handleSubscriptionActivated, {
        polarCustomerId: 'cus_123',
        polarSubscriptionId: 'sub_456',
        userId,
      });

      const user = await t.run(async (ctx) => ctx.db.get(userId));
      expect(user?.subscriptionTier).toBe('unlimited');
      expect(user?.subscriptionStatus).toBe('active');
      expect(user?.polarCustomerId).toBe('cus_123');
      expect(user?.polarSubscriptionId).toBe('sub_456');
    });
  });

  describe('handleSubscriptionCanceled', () => {
    it('downgrades user to free tier', async () => {
      const t = convexTest(schema, getModules());
      const { userId } = await setupAuthenticatedUser(t, {
        subscriptionTier: 'unlimited',
        subscriptionStatus: 'active',
      });

      await t.mutation(api.subscription.handleSubscriptionCanceled, {
        userId,
      });

      const user = await t.run(async (ctx) => ctx.db.get(userId));
      expect(user?.subscriptionTier).toBe('free');
      expect(user?.subscriptionStatus).toBe('canceled');
    });
  });

  describe('expireTrials', () => {
    it('expires users with past trial end dates', async () => {
      const t = convexTest(schema, getModules());

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Trial User',
          email: 'trial@example.com',
          createdAt: Date.now(),
          subscriptionTier: 'unlimited',
          subscriptionStatus: 'trialing',
          trialEndsAt: Date.now() - 1000,
        });
      });

      const result = await t.mutation(api.subscription.expireTrials, {});
      expect(result.expiredCount).toBe(1);

      const user = await t.run(async (ctx) => ctx.db.get(userId));
      expect(user?.subscriptionTier).toBe('free');
      expect(user?.subscriptionStatus).toBe('canceled');
    });

    it('does not expire users with active trials', async () => {
      const t = convexTest(schema, getModules());

      await t.run(async (ctx) => {
        await ctx.db.insert('users', {
          name: 'Active Trial User',
          email: 'active@example.com',
          createdAt: Date.now(),
          subscriptionTier: 'unlimited',
          subscriptionStatus: 'trialing',
          trialEndsAt: Date.now() + 1000000,
        });
      });

      const result = await t.mutation(api.subscription.expireTrials, {});
      expect(result.expiredCount).toBe(0);
    });
  });
});

describe('tier limits', () => {
  describe('free tier limits', () => {
    it('has correct project limit', () => {
      expect(getLimit('free', 'projects')).toBe(3);
    });

    it('has correct documents per project limit', () => {
      expect(getLimit('free', 'documentsPerProject')).toBe(10);
    });

    it('has correct entities per project limit', () => {
      expect(getLimit('free', 'entitiesPerProject')).toBe(50);
    });

    it('has correct LLM extractions per month limit', () => {
      expect(getLimit('free', 'llmExtractionsPerMonth')).toBe(20);
    });

    it('has correct chat messages per month limit', () => {
      expect(getLimit('free', 'chatMessagesPerMonth')).toBe(50);
    });
  });

  describe('unlimited tier limits', () => {
    it('has infinite project limit', () => {
      expect(getLimit('unlimited', 'projects')).toBe(Infinity);
    });

    it('has infinite documents per project limit', () => {
      expect(getLimit('unlimited', 'documentsPerProject')).toBe(Infinity);
    });

    it('has infinite entities per project limit', () => {
      expect(getLimit('unlimited', 'entitiesPerProject')).toBe(Infinity);
    });

    it('has infinite LLM extractions per month limit', () => {
      expect(getLimit('unlimited', 'llmExtractionsPerMonth')).toBe(Infinity);
    });

    it('has infinite chat messages per month limit', () => {
      expect(getLimit('unlimited', 'chatMessagesPerMonth')).toBe(Infinity);
    });
  });
});
