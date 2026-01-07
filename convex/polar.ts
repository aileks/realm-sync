import { Polar } from '@convex-dev/polar';
import { api, components } from './_generated/api';
import type { Id } from './_generated/dataModel';

export const polar = new Polar(components.polar, {
  getUserInfo: async (ctx): Promise<{ userId: Id<'users'>; email: string }> => {
    const user = await ctx.runQuery(api.users.viewer);
    if (!user) {
      throw new Error('User not authenticated');
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
