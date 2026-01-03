import Google from '@auth/core/providers/google';
import { Password } from '@convex-dev/auth/providers/Password';
import { convexAuth } from '@convex-dev/auth/server';
import type { MutationCtx } from './_generated/server';
import { ConvexError } from 'convex/values';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google,
    Password({
      profile(params) {
        if (typeof params.email !== 'string') {
          throw new ConvexError('Email is required');
        }
        if (typeof params.name !== 'string') {
          throw new ConvexError('Name is required');
        }

        return {
          email: params.email,
          name: params.name,
        };
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
