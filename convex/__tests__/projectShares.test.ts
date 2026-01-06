import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { api } from '../_generated/api';
import schema from '../schema';
import type { Id } from '../_generated/dataModel';

const getModules = () => import.meta.glob('../**/*.ts');

async function setupAuthenticatedUser(
  t: ReturnType<typeof convexTest>,
  email = 'owner@example.com'
) {
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      name: 'Owner User',
      email,
      createdAt: Date.now(),
    });
  });

  const asUser = t.withIdentity({ subject: userId });
  return { userId, asUser };
}

async function setupSecondUser(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      name: 'Second User',
      email: 'second@example.com',
      createdAt: Date.now(),
    });
  });

  const asUser = t.withIdentity({ subject: userId });
  return { userId, asUser };
}

async function createProject(t: ReturnType<typeof convexTest>, userId: Id<'users'>) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert('projects', {
      userId,
      name: 'Test Project',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stats: {
        documentCount: 0,
        entityCount: 0,
        factCount: 0,
        alertCount: 0,
        noteCount: 0,
      },
    });
  });
}

describe('projectShares', () => {
  describe('invite mutation', () => {
    it('creates share invite for valid email', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const projectId = await createProject(t, userId);

      const shareId = await asUser.mutation(api.projectShares.invite, {
        projectId,
        email: 'player@example.com',
        role: 'viewer',
      });

      expect(shareId).toBeDefined();

      const share = await t.run(async (ctx) => ctx.db.get(shareId));
      expect(share?.sharedWithEmail).toBe('player@example.com');
      expect(share?.role).toBe('viewer');
      expect(share?.invitedBy).toBe(userId);
      expect(share?.acceptedAt).toBeUndefined();
    });

    it('throws when not project owner', async () => {
      const t = convexTest(schema, getModules());
      const { userId } = await setupAuthenticatedUser(t);
      const { asUser: asSecond } = await setupSecondUser(t);
      const projectId = await createProject(t, userId);

      await expect(
        asSecond.mutation(api.projectShares.invite, {
          projectId,
          email: 'player@example.com',
          role: 'viewer',
        })
      ).rejects.toThrow(/unauthorized/i);
    });

    it('throws when not authenticated', async () => {
      const t = convexTest(schema, getModules());
      const { userId } = await setupAuthenticatedUser(t);
      const projectId = await createProject(t, userId);

      await expect(
        t.mutation(api.projectShares.invite, {
          projectId,
          email: 'player@example.com',
          role: 'viewer',
        })
      ).rejects.toThrow(/unauthorized/i);
    });

    it('prevents duplicate invites to same email', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const projectId = await createProject(t, userId);

      await asUser.mutation(api.projectShares.invite, {
        projectId,
        email: 'player@example.com',
        role: 'viewer',
      });

      await expect(
        asUser.mutation(api.projectShares.invite, {
          projectId,
          email: 'player@example.com',
          role: 'editor',
        })
      ).rejects.toThrow(/already invited/i);
    });

    it('allows editor role', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const projectId = await createProject(t, userId);

      const shareId = await asUser.mutation(api.projectShares.invite, {
        projectId,
        email: 'editor@example.com',
        role: 'editor',
      });

      const share = await t.run(async (ctx) => ctx.db.get(shareId));
      expect(share?.role).toBe('editor');
    });
  });

  describe('accept mutation', () => {
    it('accepts pending invite for current user email', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { userId: secondUserId, asUser: asSecond } = await setupSecondUser(t);
      const projectId = await createProject(t, userId);

      const shareId = await asUser.mutation(api.projectShares.invite, {
        projectId,
        email: 'second@example.com',
        role: 'viewer',
      });

      await asSecond.mutation(api.projectShares.accept, { shareId });

      const share = await t.run(async (ctx) => ctx.db.get(shareId));
      expect(share?.acceptedAt).toBeDefined();
      expect(share?.sharedWithUserId).toBe(secondUserId);
    });

    it('throws when invite email does not match user', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { asUser: asSecond } = await setupSecondUser(t);
      const projectId = await createProject(t, userId);

      const shareId = await asUser.mutation(api.projectShares.invite, {
        projectId,
        email: 'different@example.com',
        role: 'viewer',
      });

      await expect(asSecond.mutation(api.projectShares.accept, { shareId })).rejects.toThrow(
        /not for you/i
      );
    });

    it('throws when already accepted', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { asUser: asSecond } = await setupSecondUser(t);
      const projectId = await createProject(t, userId);

      const shareId = await asUser.mutation(api.projectShares.invite, {
        projectId,
        email: 'second@example.com',
        role: 'viewer',
      });

      await asSecond.mutation(api.projectShares.accept, { shareId });

      await expect(asSecond.mutation(api.projectShares.accept, { shareId })).rejects.toThrow(
        /already accepted/i
      );
    });
  });

  describe('revoke mutation', () => {
    it('owner can revoke share', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const projectId = await createProject(t, userId);

      const shareId = await asUser.mutation(api.projectShares.invite, {
        projectId,
        email: 'player@example.com',
        role: 'viewer',
      });

      await asUser.mutation(api.projectShares.revoke, { shareId });

      const share = await t.run(async (ctx) => ctx.db.get(shareId));
      expect(share).toBeNull();
    });

    it('non-owner cannot revoke share', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { asUser: asSecond } = await setupSecondUser(t);
      const projectId = await createProject(t, userId);

      const shareId = await asUser.mutation(api.projectShares.invite, {
        projectId,
        email: 'player@example.com',
        role: 'viewer',
      });

      await expect(asSecond.mutation(api.projectShares.revoke, { shareId })).rejects.toThrow(
        /unauthorized/i
      );
    });
  });

  describe('listByProject query', () => {
    it('returns shares for project owner', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const projectId = await createProject(t, userId);

      await asUser.mutation(api.projectShares.invite, {
        projectId,
        email: 'viewer1@example.com',
        role: 'viewer',
      });
      await asUser.mutation(api.projectShares.invite, {
        projectId,
        email: 'editor1@example.com',
        role: 'editor',
      });

      const shares = await asUser.query(api.projectShares.listByProject, { projectId });
      expect(shares).toHaveLength(2);
    });

    it('returns empty for non-owner', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { asUser: asSecond } = await setupSecondUser(t);
      const projectId = await createProject(t, userId);

      await asUser.mutation(api.projectShares.invite, {
        projectId,
        email: 'player@example.com',
        role: 'viewer',
      });

      const shares = await asSecond.query(api.projectShares.listByProject, { projectId });
      expect(shares).toEqual([]);
    });
  });

  describe('listSharedWithMe query', () => {
    it('returns accepted shares for current user', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { asUser: asSecond } = await setupSecondUser(t);
      const projectId = await createProject(t, userId);

      const shareId = await asUser.mutation(api.projectShares.invite, {
        projectId,
        email: 'second@example.com',
        role: 'viewer',
      });

      await asSecond.mutation(api.projectShares.accept, { shareId });

      const shared = await asSecond.query(api.projectShares.listSharedWithMe, {});
      expect(shared).toHaveLength(1);
      expect(shared[0].projectId).toBe(projectId);
    });

    it('excludes pending invites', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { asUser: asSecond } = await setupSecondUser(t);
      const projectId = await createProject(t, userId);

      await asUser.mutation(api.projectShares.invite, {
        projectId,
        email: 'second@example.com',
        role: 'viewer',
      });

      const shared = await asSecond.query(api.projectShares.listSharedWithMe, {});
      expect(shared).toHaveLength(0);
    });
  });

  describe('getRole query', () => {
    it('returns owner for project owner', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const projectId = await createProject(t, userId);

      const role = await asUser.query(api.projectShares.getRole, { projectId });
      expect(role).toBe('owner');
    });

    it('returns viewer for accepted viewer share', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { asUser: asSecond } = await setupSecondUser(t);
      const projectId = await createProject(t, userId);

      const shareId = await asUser.mutation(api.projectShares.invite, {
        projectId,
        email: 'second@example.com',
        role: 'viewer',
      });
      await asSecond.mutation(api.projectShares.accept, { shareId });

      const role = await asSecond.query(api.projectShares.getRole, { projectId });
      expect(role).toBe('viewer');
    });

    it('returns editor for accepted editor share', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { asUser: asSecond } = await setupSecondUser(t);
      const projectId = await createProject(t, userId);

      const shareId = await asUser.mutation(api.projectShares.invite, {
        projectId,
        email: 'second@example.com',
        role: 'editor',
      });
      await asSecond.mutation(api.projectShares.accept, { shareId });

      const role = await asSecond.query(api.projectShares.getRole, { projectId });
      expect(role).toBe('editor');
    });

    it('returns null for no access', async () => {
      const t = convexTest(schema, getModules());
      const { userId } = await setupAuthenticatedUser(t);
      const { asUser: asSecond } = await setupSecondUser(t);
      const projectId = await createProject(t, userId);

      const role = await asSecond.query(api.projectShares.getRole, { projectId });
      expect(role).toBeNull();
    });

    it('returns null for pending invite', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { asUser: asSecond } = await setupSecondUser(t);
      const projectId = await createProject(t, userId);

      await asUser.mutation(api.projectShares.invite, {
        projectId,
        email: 'second@example.com',
        role: 'viewer',
      });

      const role = await asSecond.query(api.projectShares.getRole, { projectId });
      expect(role).toBeNull();
    });
  });

  describe('pendingInvites query', () => {
    it('returns pending invites for user email', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { asUser: asSecond } = await setupSecondUser(t);
      const projectId = await createProject(t, userId);

      await asUser.mutation(api.projectShares.invite, {
        projectId,
        email: 'second@example.com',
        role: 'viewer',
      });

      const pending = await asSecond.query(api.projectShares.pendingInvites, {});
      expect(pending).toHaveLength(1);
      expect(pending[0].projectId).toBe(projectId);
    });

    it('excludes accepted invites', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { asUser: asSecond } = await setupSecondUser(t);
      const projectId = await createProject(t, userId);

      const shareId = await asUser.mutation(api.projectShares.invite, {
        projectId,
        email: 'second@example.com',
        role: 'viewer',
      });
      await asSecond.mutation(api.projectShares.accept, { shareId });

      const pending = await asSecond.query(api.projectShares.pendingInvites, {});
      expect(pending).toHaveLength(0);
    });
  });
});
