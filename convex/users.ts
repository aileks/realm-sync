import { query } from './_generated/server';
import { getCurrentUser } from './lib/auth';

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});
