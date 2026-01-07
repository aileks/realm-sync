import { Polar } from '@convex-dev/polar';
import { internalAction } from './_generated/server';
import { api, components } from './_generated/api';
import type { Id } from './_generated/dataModel';

const PRODUCTS = {
  realmUnlimited: '413edc1d-2f18-4692-ab47-f2e4b2c9f2ad',
} as const;

export type ProductKey = keyof typeof PRODUCTS;

export const polar = new Polar(components.polar, {
  products: PRODUCTS,
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
});

export const {
  getConfiguredProducts,
  listAllProducts,
  generateCheckoutLink,
  generateCustomerPortalUrl,
  changeCurrentSubscription,
  cancelCurrentSubscription,
} = polar.api();

export const syncProducts = internalAction({
  args: {},
  handler: async (ctx) => {
    await polar.syncProducts(ctx);
  },
});
