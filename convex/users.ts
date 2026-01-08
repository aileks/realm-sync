import { action, internalMutation, mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { z } from 'zod';
import { api, internal } from './_generated/api';
import { getCurrentUser, requireAuthUser } from './lib/auth';
import { getAuthUserId, retrieveAccount, modifyAccountCredentials } from '@convex-dev/auth/server';
import {
  MAX_AVATAR_SIZE,
  ALLOWED_AVATAR_TYPES,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from './lib/constants';

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const viewerProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const avatarUrl =
      user.avatarStorageId ? await ctx.storage.getUrl(user.avatarStorageId) : (user.image ?? null);

    return {
      ...user,
      avatarUrl,
    };
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, { name, bio }) => {
    const user = await requireAuthUser(ctx);

    const updates: Record<string, string> = {};

    if (name !== undefined) {
      const trimmed = name.trim();
      if (trimmed.length === 0) {
        throw new Error('Name cannot be empty');
      }
      if (trimmed.length > 80) {
        throw new Error('Name must be 80 characters or less');
      }
      updates.name = trimmed;
    }

    if (bio !== undefined) {
      const trimmed = bio.trim();
      if (trimmed.length > 500) {
        throw new Error('Bio must be 500 characters or less');
      }
      updates.bio = trimmed;
    }

    if (Object.keys(updates).length === 0) {
      throw new Error('No fields to update');
    }

    await ctx.db.patch(user._id, updates);
    return user._id;
  },
});

export const updateAvatar = mutation({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, { storageId }) => {
    const user = await requireAuthUser(ctx);

    const meta = await ctx.db.system.get(storageId);
    if (!meta) {
      throw new Error('File not found');
    }

    if (!ALLOWED_AVATAR_TYPES.includes(meta.contentType as (typeof ALLOWED_AVATAR_TYPES)[number])) {
      await ctx.storage.delete(storageId);
      throw new Error('Invalid file type. Use JPG, PNG, or WebP.');
    }

    if (meta.size > MAX_AVATAR_SIZE) {
      await ctx.storage.delete(storageId);
      throw new Error('File too large. Maximum size is 5MB.');
    }

    const oldAvatarId = user.avatarStorageId;

    await ctx.db.patch(user._id, { avatarStorageId: storageId });

    if (oldAvatarId) {
      await ctx.storage.delete(oldAvatarId);
    }

    return storageId;
  },
});

export const removeAvatar = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);

    if (user.avatarStorageId) {
      await ctx.storage.delete(user.avatarStorageId);
      await ctx.db.patch(user._id, { avatarStorageId: undefined });
    }

    return user._id;
  },
});

export const changePassword = action({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { currentPassword, newPassword }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Unauthorized: Authentication required');
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    if (newPassword.length > MAX_PASSWORD_LENGTH) {
      throw new Error(`Password must be ${MAX_PASSWORD_LENGTH} characters or less`);
    }

    // Enforce password complexity requirements
    if (!/[A-Z]/.test(newPassword)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(newPassword)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(newPassword)) {
      throw new Error('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=[\]{}|\\:;"'<>,.?/]/.test(newPassword)) {
      throw new Error('Password must contain at least one special character');
    }

    const user = await ctx.runQuery(api.users.viewer);
    if (!user?.email) {
      throw new Error('User email not found. Password login may not be configured.');
    }

    try {
      await retrieveAccount(ctx, {
        provider: 'password',
        account: {
          id: user.email,
          secret: currentPassword,
        },
      });
    } catch {
      throw new Error('Current password is incorrect');
    }

    await modifyAccountCredentials(ctx, {
      provider: 'password',
      account: {
        id: user.email,
        secret: newPassword,
      },
    });

    return userId;
  },
});

export const updateEmailInternal = internalMutation({
  args: {
    userId: v.id('users'),
    oldEmail: v.string(),
    newEmail: v.string(),
  },
  handler: async (ctx, { userId, oldEmail, newEmail }) => {
    await ctx.db.patch(userId, { email: newEmail });

    const authAccount = await ctx.db
      .query('authAccounts')
      .withIndex('providerAndAccountId', (q) =>
        q.eq('provider', 'password').eq('providerAccountId', oldEmail)
      )
      .first();

    if (authAccount) {
      await ctx.db.patch(authAccount._id, { providerAccountId: newEmail });
    }

    return userId;
  },
});

export const checkEmailAvailable = query({
  args: {
    email: v.string(),
    excludeUserId: v.id('users'),
  },
  handler: async (ctx, { email, excludeUserId }) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', email))
      .first();

    return !existing || existing._id === excludeUserId;
  },
});

export const updateEmail = action({
  args: {
    newEmail: v.string(),
  },
  handler: async (ctx, { newEmail }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Unauthorized: Authentication required');
    }

    const normalized = newEmail.toLowerCase().trim();

    const emailSchema = z.string().email();
    const result = emailSchema.safeParse(normalized);
    if (!result.success) {
      throw new Error('Invalid email format');
    }

    const user = await ctx.runQuery(api.users.viewer);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.email === normalized) {
      throw new Error('New email is the same as current email');
    }

    const isAvailable = await ctx.runQuery(api.users.checkEmailAvailable, {
      email: normalized,
      excludeUserId: userId,
    });

    if (!isAvailable) {
      throw new Error('Email already in use');
    }

    await ctx.runMutation(internal.users.updateEmailInternal, {
      userId,
      oldEmail: user.email ?? '',
      newEmail: normalized,
    });

    return userId;
  },
});

export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    await ctx.db.patch(user._id, { onboardingCompleted: true });
    return user._id;
  },
});

export const startTutorialTour = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    const now = Date.now();

    const tutorialState = user.tutorialState ?? {
      hasSeenTour: false,
      completedSteps: [],
    };

    await ctx.db.patch(user._id, {
      tutorialState: {
        hasSeenTour: tutorialState.hasSeenTour ?? false,
        completedSteps: tutorialState.completedSteps ?? [],
        tourStartedAt: tutorialState.tourStartedAt ?? now,
        tourCompletedAt: tutorialState.tourCompletedAt,
      },
    });

    return { startedAt: tutorialState.tourStartedAt ?? now };
  },
});

export const recordTutorialStep = mutation({
  args: { stepId: v.string() },
  handler: async (ctx, { stepId }) => {
    const user = await requireAuthUser(ctx);
    const tutorialState = user.tutorialState ?? {
      hasSeenTour: false,
      completedSteps: [],
    };

    const completedSteps = tutorialState.completedSteps ?? [];
    const nextSteps =
      completedSteps.includes(stepId) ? completedSteps : [...completedSteps, stepId];

    await ctx.db.patch(user._id, {
      tutorialState: {
        hasSeenTour: tutorialState.hasSeenTour ?? false,
        completedSteps: nextSteps,
        tourStartedAt: tutorialState.tourStartedAt,
        tourCompletedAt: tutorialState.tourCompletedAt,
      },
    });

    return { completedSteps: nextSteps };
  },
});

export const completeTutorialTour = mutation({
  args: { completedSteps: v.array(v.string()) },
  handler: async (ctx, { completedSteps }) => {
    const user = await requireAuthUser(ctx);
    const now = Date.now();
    const tutorialState = user.tutorialState ?? {
      hasSeenTour: false,
      completedSteps: [],
    };

    const mergedSteps = new Set([...(tutorialState.completedSteps ?? []), ...completedSteps]);

    await ctx.db.patch(user._id, {
      tutorialState: {
        hasSeenTour: true,
        completedSteps: Array.from(mergedSteps),
        tourStartedAt: tutorialState.tourStartedAt ?? now,
        tourCompletedAt: now,
      },
    });

    return { completedSteps: Array.from(mergedSteps), completedAt: now };
  },
});

export const listByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', email))
      .collect();
  },
});

export const getByPolarCustomerId = query({
  args: { polarCustomerId: v.string() },
  handler: async (ctx, { polarCustomerId }) => {
    return await ctx.db
      .query('users')
      .withIndex('by_polar_customer', (q) => q.eq('polarCustomerId', polarCustomerId))
      .first();
  },
});

export const updateSubscription = mutation({
  args: {
    userId: v.id('users'),
    polarCustomerId: v.optional(v.string()),
    polarSubscriptionId: v.optional(v.string()),
    subscriptionTier: v.optional(v.union(v.literal('free'), v.literal('unlimited'))),
    subscriptionStatus: v.optional(
      v.union(
        v.literal('active'),
        v.literal('trialing'),
        v.literal('canceled'),
        v.literal('past_due'),
        v.literal('incomplete'),
        v.literal('incomplete_expired')
      )
    ),
    trialEndsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      polarCustomerId: args.polarCustomerId,
      polarSubscriptionId: args.polarSubscriptionId,
      subscriptionTier: args.subscriptionTier,
      subscriptionStatus: args.subscriptionStatus,
      trialEndsAt: args.trialEndsAt,
    });
    return args.userId;
  },
});

const projectModeValidator = v.union(
  v.literal('ttrpg'),
  v.literal('original-fiction'),
  v.literal('fanfiction'),
  v.literal('game-design')
);

export const getSubscription = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const tier = user.subscriptionTier ?? 'free';
    const projects = await ctx.db
      .query('projects')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    return {
      tier,
      status: user.subscriptionStatus ?? 'free',
      trialActive:
        user.subscriptionStatus === 'trialing' && user.trialEndsAt && Date.now() < user.trialEndsAt,
      trialExpired:
        user.subscriptionStatus === 'trialing' &&
        user.trialEndsAt &&
        Date.now() >= user.trialEndsAt,
      trialEndsAt: user.trialEndsAt,
      polarCustomerId: user.polarCustomerId,
      polarSubscriptionId: user.polarSubscriptionId,
      usage: {
        projects: {
          current: projects.length,
          limit: tier === 'unlimited' ? Infinity : 3,
        },
        llmExtractions: {
          current: user.usage?.llmExtractionsThisMonth ?? 0,
          limit: tier === 'unlimited' ? Infinity : 20,
        },
        chatMessages: {
          current: user.usage?.chatMessagesThisMonth ?? 0,
          limit: tier === 'unlimited' ? Infinity : 50,
        },
        resetAt: user.usage?.usageResetAt ?? Date.now(),
      },
      pricing: {
        amount: '$5/month',
        tierName: 'Realm Unlimited',
      },
    };
  },
});

export const startTrial = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    if (!user) throw new Error('User not found');

    if (user.subscriptionTier === 'unlimited' && user.subscriptionStatus === 'active') {
      throw new Error('Already subscribed to Realm Unlimited');
    }

    if (user.trialEndsAt) {
      throw new Error('Trial already used');
    }

    const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
    const trialEndsAt = Date.now() + TRIAL_DURATION_MS;

    await ctx.db.patch(user._id, {
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
    if (!user) return null;

    const tier = user.subscriptionTier ?? 'free';

    const projectCount = await ctx.db
      .query('projects')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    return {
      tier,
      projects: {
        current: projectCount.length,
        limit: tier === 'unlimited' ? Infinity : 3,
      },
      llmExtractions: {
        current: user.usage?.llmExtractionsThisMonth ?? 0,
        limit: tier === 'unlimited' ? Infinity : 20,
      },
      chatMessages: {
        current: user.usage?.chatMessagesThisMonth ?? 0,
        limit: tier === 'unlimited' ? Infinity : 50,
      },
    };
  },
});

export const updateProjectModes = mutation({
  args: { projectModes: v.array(projectModeValidator) },
  handler: async (ctx, { projectModes }) => {
    const user = await requireAuthUser(ctx);
    const settings = user.settings ?? {};

    await ctx.db.patch(user._id, {
      settings: { ...settings, projectModes },
    });

    return user._id;
  },
});

export const deleteAccount = mutation({
  args: {
    confirmationPhrase: v.string(),
  },
  handler: async (ctx, { confirmationPhrase }) => {
    if (confirmationPhrase !== 'delete my account') {
      throw new Error('Confirmation phrase does not match');
    }

    const user = await requireAuthUser(ctx);

    if (user.polarSubscriptionId) {
      try {
        await ctx.scheduler.runAfter(0, api.polar.cancelCurrentSubscription, {});
      } catch (error) {
        console.error('Failed to cancel Polar subscription:', error);
      }
    }

    const authSessions = await ctx.db
      .query('authSessions')
      .withIndex('userId', (q) => q.eq('userId', user._id))
      .collect();

    const authAccounts = await ctx.db
      .query('authAccounts')
      .filter((q) => q.eq(q.field('userId'), user._id))
      .collect();

    const refreshTokensResults = await Promise.all(
      authSessions.map((session) =>
        ctx.db
          .query('authRefreshTokens')
          .withIndex('sessionId', (q) => q.eq('sessionId', session._id))
          .collect()
      )
    );
    const refreshTokens = refreshTokensResults.flat();

    const verificationCodesResults = await Promise.all(
      authAccounts.map((account) =>
        ctx.db
          .query('authVerificationCodes')
          .withIndex('accountId', (q) => q.eq('accountId', account._id))
          .collect()
      )
    );
    const verificationCodes = verificationCodesResults.flat();

    const verifiersResults = await Promise.all(
      authSessions.map((session) =>
        ctx.db
          .query('authVerifiers')
          .filter((q) => q.eq(q.field('sessionId'), session._id))
          .collect()
      )
    );
    const verifiers = verifiersResults.flat();

    await Promise.all([
      ...refreshTokens.map((token) => ctx.db.delete(token._id)),
      ...verificationCodes.map((code) => ctx.db.delete(code._id)),
      ...verifiers.map((verifier) => ctx.db.delete(verifier._id)),
      ...authSessions.map((session) => ctx.db.delete(session._id)),
      ...authAccounts.map((account) => ctx.db.delete(account._id)),
    ]);

    console.log(
      `[deleteAccount] Auth cleanup for user ${user._id}: ` +
        `${refreshTokens.length} refreshTokens, ${verificationCodes.length} verificationCodes, ` +
        `${verifiers.length} verifiers, ${authSessions.length} sessions, ${authAccounts.length} accounts`
    );

    const projects = await ctx.db
      .query('projects')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    for (const project of projects) {
      const documents = await ctx.db
        .query('documents')
        .withIndex('by_project', (q) => q.eq('projectId', project._id))
        .collect();
      for (const doc of documents) {
        if (doc.storageId) {
          await ctx.storage.delete(doc.storageId);
        }
        await ctx.db.delete(doc._id);
      }

      const entities = await ctx.db
        .query('entities')
        .withIndex('by_project', (q) => q.eq('projectId', project._id))
        .collect();
      for (const entity of entities) {
        const entityNotes = await ctx.db
          .query('entityNotes')
          .withIndex('by_entity', (q) => q.eq('entityId', entity._id))
          .collect();
        for (const note of entityNotes) {
          await ctx.db.delete(note._id);
        }
        await ctx.db.delete(entity._id);
      }

      const facts = await ctx.db
        .query('facts')
        .withIndex('by_project', (q) => q.eq('projectId', project._id))
        .collect();
      for (const fact of facts) {
        await ctx.db.delete(fact._id);
      }

      const alerts = await ctx.db
        .query('alerts')
        .withIndex('by_project', (q) => q.eq('projectId', project._id))
        .collect();
      for (const alert of alerts) {
        await ctx.db.delete(alert._id);
      }

      const notes = await ctx.db
        .query('notes')
        .withIndex('by_project', (q) => q.eq('projectId', project._id))
        .collect();
      for (const note of notes) {
        await ctx.db.delete(note._id);
      }

      await ctx.db.delete(project._id);
    }

    console.log(`[deleteAccount] Deleted ${projects.length} projects for user ${user._id}`);

    const chatMessages = await ctx.db
      .query('chatMessages')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
    for (const msg of chatMessages) {
      await ctx.db.delete(msg._id);
    }

    console.log(
      `[deleteAccount] Deleted ${chatMessages.length} chat messages for user ${user._id}`
    );

    if (user.avatarStorageId) {
      await ctx.storage.delete(user.avatarStorageId);
      console.log(`[deleteAccount] Deleted avatar storage for user ${user._id}`);
    }

    await ctx.db.delete(user._id);

    console.log(`[deleteAccount] Successfully deleted user ${user._id} (${user.email})`);

    return { success: true };
  },
});

export const grantLifetimeAccess = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const users = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', email))
      .collect();

    if (users.length === 0) {
      throw new Error(`User not found with email: ${email}`);
    }

    const user = users[0];
    await ctx.db.patch(user._id, {
      subscriptionTier: 'unlimited',
      subscriptionStatus: 'active',
      trialEndsAt: undefined,
    });

    return { userId: user._id, email: user.email };
  },
});
