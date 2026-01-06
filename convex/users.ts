import { mutation, query } from './_generated/server';
import { getCurrentUser, requireAuthUser } from './lib/auth';
import { v } from 'convex/values';

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

export const startTour = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    await ctx.db.patch(user._id, {
      tourState: {
        currentStepIndex: 0,
        completed: false,
        startedAt: Date.now(),
      },
    });
  },
});

export const updateTourProgress = mutation({
  args: { stepIndex: v.number() },
  handler: async (ctx, { stepIndex }) => {
    const user = await requireAuthUser(ctx);
    const currentState = user.tourState ?? {
      currentStepIndex: 0,
      completed: false,
      startedAt: Date.now(),
    };
    await ctx.db.patch(user._id, {
      tourState: {
        ...currentState,
        currentStepIndex: stepIndex,
      },
    });
  },
});

export const completeTour = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    const currentState = user.tourState ?? {
      currentStepIndex: 0,
      completed: false,
      startedAt: Date.now(),
    };
    await ctx.db.patch(user._id, {
      tourState: {
        ...currentState,
        completed: true,
        completedAt: Date.now(),
      },
    });
  },
});

export const skipTour = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    await ctx.db.patch(user._id, {
      tourState: {
        currentStepIndex: 0,
        completed: true,
        completedAt: Date.now(),
      },
    });
  },
});
