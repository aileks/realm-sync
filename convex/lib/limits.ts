export type SubscriptionTier = 'free' | 'unlimited';

export type LimitType =
  | 'projects'
  | 'documentsPerProject'
  | 'entitiesPerProject'
  | 'llmExtractionsPerMonth'
  | 'chatMessagesPerMonth';

type TierLimits = Record<LimitType, number>;

const FREE_TIER_LIMITS: TierLimits = {
  projects: 3,
  documentsPerProject: 10,
  entitiesPerProject: 50,
  llmExtractionsPerMonth: 20,
  chatMessagesPerMonth: 50,
};

const UNLIMITED_TIER_LIMITS: TierLimits = {
  projects: Infinity,
  documentsPerProject: Infinity,
  entitiesPerProject: Infinity,
  llmExtractionsPerMonth: Infinity,
  chatMessagesPerMonth: Infinity,
};

const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: FREE_TIER_LIMITS,
  unlimited: UNLIMITED_TIER_LIMITS,
};

export function getLimit(tier: SubscriptionTier, limitType: LimitType): number {
  return TIER_LIMITS[tier][limitType];
}

export function isUnlimited(tier: SubscriptionTier, limitType: LimitType): boolean {
  return getLimit(tier, limitType) === Infinity;
}

export const WARNING_THRESHOLD = 0.8;

export const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export const MONTHLY_RESET_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;

export const SUBSCRIPTION_PRICE_CENTS = 500;
export const SUBSCRIPTION_PRICE_DISPLAY = '$5/month';
export const SUBSCRIPTION_TIER_NAME = 'Realm Unlimited';
