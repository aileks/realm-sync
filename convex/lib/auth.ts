import { getAuthUserId as convexGetAuthUserId } from '@convex-dev/auth/server';
import type { Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';

export async function getAuthUserId(ctx: QueryCtx | MutationCtx): Promise<Id<'users'> | null> {
  return await convexGetAuthUserId(ctx);
}

export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  return await ctx.db.get(userId);
}

export async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<Id<'users'>> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error('Unauthorized: Authentication required');
  }
  return userId;
}

export async function requireAuthUser(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error('Unauthorized: Authentication required');
  }
  return user;
}
