import { Polar } from '@convex-dev/polar';
import { api, components } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { DEMO_EMAIL } from './lib/demo';
import { authError, notAllowedError } from './lib/errors';

export const polar = new Polar(components.polar, {
  getUserInfo: async (ctx): Promise<{ userId: Id<'users'>; email: string }> => {
    const user = await ctx.runQuery(api.users.viewer);
    if (!user) {
      throw authError('unauthenticated', 'Please sign in to continue.');
    }
    if (user.email?.toLowerCase() === DEMO_EMAIL) {
      throw notAllowedError('Demo accounts cannot start a subscription');
    }
    return {
      userId: user._id,
      email: user.email ?? '',
    };
  },
  // Don't configure products here - use listAllProducts dynamically
  server: (process.env.POLAR_SERVER as 'sandbox' | 'production') ?? 'production',
});

export const {
  changeCurrentSubscription,
  cancelCurrentSubscription,
  listAllProducts,
  generateCheckoutLink,
  generateCustomerPortalUrl,
} = polar.api();
