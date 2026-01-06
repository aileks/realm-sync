import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getAuthUserId, requireAuth, requireAuthUser } from './lib/auth';

const roleValidator = v.union(v.literal('editor'), v.literal('viewer'));

export const invite = mutation({
  args: {
    projectId: v.id('projects'),
    email: v.string(),
    role: roleValidator,
  },
  handler: async (ctx, { projectId, email, role }) => {
    const userId = await requireAuth(ctx);

    const project = await ctx.db.get(projectId);
    if (!project || project.userId !== userId) {
      throw new Error('Unauthorized: Only project owner can invite');
    }

    const existing = await ctx.db
      .query('projectShares')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .filter((q) => q.eq(q.field('sharedWithEmail'), email))
      .first();

    if (existing) {
      throw new Error('User already invited to this project');
    }

    return await ctx.db.insert('projectShares', {
      projectId,
      sharedWithEmail: email,
      role,
      invitedBy: userId,
      createdAt: Date.now(),
    });
  },
});

export const accept = mutation({
  args: {
    shareId: v.id('projectShares'),
  },
  handler: async (ctx, { shareId }) => {
    const user = await requireAuthUser(ctx);

    const share = await ctx.db.get(shareId);
    if (!share) {
      throw new Error('Share invite not found');
    }

    if (share.sharedWithEmail !== user.email) {
      throw new Error('This invite is not for you');
    }

    if (share.acceptedAt) {
      throw new Error('Invite already accepted');
    }

    await ctx.db.patch(shareId, {
      sharedWithUserId: user._id,
      acceptedAt: Date.now(),
    });
  },
});

export const revoke = mutation({
  args: {
    shareId: v.id('projectShares'),
  },
  handler: async (ctx, { shareId }) => {
    const userId = await requireAuth(ctx);

    const share = await ctx.db.get(shareId);
    if (!share) {
      throw new Error('Share not found');
    }

    const project = await ctx.db.get(share.projectId);
    if (!project || project.userId !== userId) {
      throw new Error('Unauthorized: Only project owner can revoke shares');
    }

    await ctx.db.delete(shareId);
  },
});

export const listByProject = query({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, { projectId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const project = await ctx.db.get(projectId);
    if (!project || project.userId !== userId) {
      return [];
    }

    return await ctx.db
      .query('projectShares')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect();
  },
});

export const listSharedWithMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query('projectShares')
      .withIndex('by_user', (q) => q.eq('sharedWithUserId', userId))
      .filter((q) => q.neq(q.field('acceptedAt'), undefined))
      .collect();
  },
});

export const getRole = query({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, { projectId }): Promise<'owner' | 'editor' | 'viewer' | null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const project = await ctx.db.get(projectId);
    if (!project) return null;

    if (project.userId === userId) {
      return 'owner';
    }

    const share = await ctx.db
      .query('projectShares')
      .withIndex('by_user', (q) => q.eq('sharedWithUserId', userId))
      .filter((q) => q.eq(q.field('projectId'), projectId))
      .filter((q) => q.neq(q.field('acceptedAt'), undefined))
      .first();

    if (share) {
      return share.role;
    }

    return null;
  },
});

export const pendingInvites = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    if (!user.email) return [];

    return await ctx.db
      .query('projectShares')
      .withIndex('by_email', (q) => q.eq('sharedWithEmail', user.email!))
      .filter((q) => q.eq(q.field('acceptedAt'), undefined))
      .collect();
  },
});
