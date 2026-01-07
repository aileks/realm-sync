import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import {
  type SubscriptionTier,
  getLimit,
  isUnlimited,
  WARNING_THRESHOLD,
  MONTHLY_RESET_INTERVAL_MS,
} from './limits';

export type LimitCheckResult =
  | { allowed: true; current: number; limit: number; warning: boolean }
  | { allowed: false; current: number; limit: number; reason: 'limit_exceeded' };

export function getUserTier(user: Doc<'users'>): SubscriptionTier {
  if (user.subscriptionTier === 'unlimited') {
    const status = user.subscriptionStatus;
    if (status === 'active' || status === 'trialing') {
      return 'unlimited';
    }
  }
  return 'free';
}

export function isTrialActive(user: Doc<'users'>): boolean {
  if (user.subscriptionStatus !== 'trialing') return false;
  if (!user.trialEndsAt) return false;
  return Date.now() < user.trialEndsAt;
}

export function isTrialExpired(user: Doc<'users'>): boolean {
  if (!user.trialEndsAt) return false;
  return Date.now() >= user.trialEndsAt && user.subscriptionStatus === 'trialing';
}

export function shouldResetUsage(user: Doc<'users'>): boolean {
  if (!user.usage) return true;
  return Date.now() >= user.usage.usageResetAt + MONTHLY_RESET_INTERVAL_MS;
}

export function getUsageForType(
  user: Doc<'users'>,
  limitType: 'llmExtractionsPerMonth' | 'chatMessagesPerMonth'
): number {
  if (!user.usage) return 0;
  if (limitType === 'llmExtractionsPerMonth') {
    return user.usage.llmExtractionsThisMonth;
  }
  return user.usage.chatMessagesThisMonth;
}

export function checkUsageLimit(
  user: Doc<'users'>,
  limitType: 'llmExtractionsPerMonth' | 'chatMessagesPerMonth'
): LimitCheckResult {
  const tier = getUserTier(user);
  const limit = getLimit(tier, limitType);

  if (isUnlimited(tier, limitType)) {
    return { allowed: true, current: 0, limit: Infinity, warning: false };
  }

  const current = getUsageForType(user, limitType);
  const allowed = current < limit;
  const warning = allowed && current >= limit * WARNING_THRESHOLD;

  if (!allowed) {
    return { allowed: false, current, limit, reason: 'limit_exceeded' };
  }

  return { allowed: true, current, limit, warning };
}

export function checkResourceLimit(
  user: Doc<'users'>,
  limitType: 'projects' | 'documentsPerProject' | 'entitiesPerProject',
  currentCount: number
): LimitCheckResult {
  const tier = getUserTier(user);
  const limit = getLimit(tier, limitType);

  if (isUnlimited(tier, limitType)) {
    return { allowed: true, current: currentCount, limit: Infinity, warning: false };
  }

  const allowed = currentCount < limit;
  const warning = allowed && currentCount >= limit * WARNING_THRESHOLD;

  if (!allowed) {
    return { allowed: false, current: currentCount, limit, reason: 'limit_exceeded' };
  }

  return { allowed: true, current: currentCount, limit, warning };
}

export async function resetUsageIfNeeded(ctx: MutationCtx, userId: Id<'users'>): Promise<void> {
  const user = await ctx.db.get(userId);
  if (!user) return;

  if (shouldResetUsage(user)) {
    await ctx.db.patch(userId, {
      usage: {
        llmExtractionsThisMonth: 0,
        chatMessagesThisMonth: 0,
        usageResetAt: Date.now(),
      },
    });
  }
}

export async function incrementUsage(
  ctx: MutationCtx,
  userId: Id<'users'>,
  usageType: 'llmExtractionsThisMonth' | 'chatMessagesThisMonth'
): Promise<void> {
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
      [usageType]: currentUsage[usageType] + 1,
    },
  });
}

export async function getProjectCount(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>
): Promise<number> {
  const projects = await ctx.db
    .query('projects')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();
  return projects.length;
}

export async function getDocumentCount(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<'projects'>
): Promise<number> {
  const documents = await ctx.db
    .query('documents')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .collect();
  return documents.length;
}

export async function getEntityCount(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<'projects'>
): Promise<number> {
  const entities = await ctx.db
    .query('entities')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .collect();
  return entities.length;
}
