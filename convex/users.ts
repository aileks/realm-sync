import { action, internalMutation, mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { z } from 'zod';
import { api, internal } from './_generated/api';
import { getCurrentUser, requireAuthUser } from './lib/auth';
import { getAuthUserId, retrieveAccount, modifyAccountCredentials } from '@convex-dev/auth/server';

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

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(meta.contentType ?? '')) {
      await ctx.storage.delete(storageId);
      throw new Error('Invalid file type. Use JPG, PNG, or WebP.');
    }

    if (meta.size > maxSize) {
      await ctx.storage.delete(storageId);
      throw new Error('File too large. Maximum size is 5MB.');
    }

    if (user.avatarStorageId) {
      await ctx.storage.delete(user.avatarStorageId);
    }

    await ctx.db.patch(user._id, { avatarStorageId: storageId });
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

    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    if (newPassword.length > 128) {
      throw new Error('Password must be 128 characters or less');
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

const projectModeValidator = v.union(
  v.literal('ttrpg'),
  v.literal('original-fiction'),
  v.literal('fanfiction'),
  v.literal('game-design')
);

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
