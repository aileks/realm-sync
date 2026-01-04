import { getAuthUserId as convexGetAuthUserId } from '@convex-dev/auth/server';
import type { Id, Doc } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';

async function getAuthUserId(ctx: QueryCtx | MutationCtx): Promise<Id<'users'> | null> {
  return await convexGetAuthUserId(ctx);
}

async function getCurrentUser(ctx: QueryCtx | MutationCtx): Promise<Doc<'users'> | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  return await ctx.db.get(userId);
}

async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<Id<'users'>> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error('Unauthorized: Authentication required');
  }
  return userId;
}

async function requireAuthUser(ctx: QueryCtx | MutationCtx): Promise<Doc<'users'>> {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error('Unauthorized: Authentication required');
  }
  return user;
}

export { getAuthUserId, getCurrentUser, requireAuth, requireAuthUser };
