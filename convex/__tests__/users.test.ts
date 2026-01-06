import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { api } from '../_generated/api';
import schema from '../schema';

const getModules = () => import.meta.glob('../**/*.ts');

async function setupAuthenticatedUser(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      name: 'Test User',
      email: 'test@example.com',
      createdAt: Date.now(),
    });
  });

  const asUser = t.withIdentity({ subject: userId });
  return { userId, asUser };
}

describe('users', () => {
  describe('viewer query', () => {
    it('returns null when not authenticated', async () => {
      const t = convexTest(schema, getModules());
      const viewer = await t.query(api.users.viewer, {});
      expect(viewer).toBeNull();
    });

    it('returns user when authenticated', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);
      const viewer = await asUser.query(api.users.viewer, {});
      expect(viewer).not.toBeNull();
      expect(viewer?.name).toBe('Test User');
    });
  });

  describe('startTour mutation', () => {
    it('initializes tour state for user', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      await asUser.mutation(api.users.startTour, {});

      const user = await t.run(async (ctx) => ctx.db.get(userId));
      expect(user?.tourState).toBeDefined();
      expect(user?.tourState?.currentStepIndex).toBe(0);
      expect(user?.tourState?.completed).toBe(false);
      expect(user?.tourState?.startedAt).toBeDefined();
    });

    it('throws when not authenticated', async () => {
      const t = convexTest(schema, getModules());
      await expect(t.mutation(api.users.startTour, {})).rejects.toThrow('Authentication required');
    });
  });

  describe('updateTourProgress mutation', () => {
    it('updates step index', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      await asUser.mutation(api.users.startTour, {});
      await asUser.mutation(api.users.updateTourProgress, { stepIndex: 3 });

      const user = await t.run(async (ctx) => ctx.db.get(userId));
      expect(user?.tourState?.currentStepIndex).toBe(3);
      expect(user?.tourState?.completed).toBe(false);
    });

    it('initializes tour state if not present', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      await asUser.mutation(api.users.updateTourProgress, { stepIndex: 2 });

      const user = await t.run(async (ctx) => ctx.db.get(userId));
      expect(user?.tourState?.currentStepIndex).toBe(2);
    });
  });

  describe('completeTour mutation', () => {
    it('marks tour as completed with timestamp', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      await asUser.mutation(api.users.startTour, {});
      await asUser.mutation(api.users.completeTour, {});

      const user = await t.run(async (ctx) => ctx.db.get(userId));
      expect(user?.tourState?.completed).toBe(true);
      expect(user?.tourState?.completedAt).toBeDefined();
    });
  });

  describe('skipTour mutation', () => {
    it('marks tour as completed when skipped', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      await asUser.mutation(api.users.skipTour, {});

      const user = await t.run(async (ctx) => ctx.db.get(userId));
      expect(user?.tourState?.completed).toBe(true);
      expect(user?.tourState?.completedAt).toBeDefined();
      expect(user?.tourState?.currentStepIndex).toBe(0);
    });
  });
});
