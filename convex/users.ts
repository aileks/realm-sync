import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getCurrentUser, requireAuthUser } from './lib/auth';

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
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
  v.literal('game-design'),
  v.literal('general')
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
