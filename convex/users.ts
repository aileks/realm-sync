import { mutation, query } from './_generated/server';
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
