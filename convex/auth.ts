import { Password } from '@convex-dev/auth/providers/Password';
import { convexAuth } from '@convex-dev/auth/server';
import type { MutationCtx } from './_generated/server';
import { ConvexError } from 'convex/values';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        if (typeof params.email !== 'string') {
          throw new ConvexError('Email is required');
        }

        const profile: { email: string; name?: string } = { email: params.email };
        if (typeof params.name === 'string') {
          profile.name = params.name;
        }
        return profile;
      },
    }),
  ],
  callbacks: {
    async createOrUpdateUser(ctx: MutationCtx, args) {
      if (args.existingUserId) {
        return args.existingUserId;
      }
      return ctx.db.insert('users', {
        ...args.profile,
        createdAt: Date.now(),
      });
    },
  },
});
