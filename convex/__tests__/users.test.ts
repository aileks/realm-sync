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

describe('users tutorial tour', () => {
  it('starts the tutorial tour with default state', async () => {
    const t = convexTest(schema, getModules());
    const { userId, asUser } = await setupAuthenticatedUser(t);

    await asUser.mutation(api.users.startTutorialTour, {});

    const user = await t.run(async (ctx) => await ctx.db.get(userId));

    expect(user?.tutorialState?.hasSeenTour).toBe(false);
    expect(user?.tutorialState?.completedSteps).toEqual([]);
    expect(user?.tutorialState?.tourStartedAt).toBeTypeOf('number');
    expect(user?.tutorialState?.tourCompletedAt).toBeUndefined();
  });

  it('records tutorial steps without duplicates', async () => {
    const t = convexTest(schema, getModules());
    const { userId, asUser } = await setupAuthenticatedUser(t);

    await asUser.mutation(api.users.recordTutorialStep, { stepId: 'project-overview' });
    await asUser.mutation(api.users.recordTutorialStep, { stepId: 'project-overview' });

    const user = await t.run(async (ctx) => await ctx.db.get(userId));

    expect(user?.tutorialState?.completedSteps).toEqual(['project-overview']);
    expect(user?.tutorialState?.hasSeenTour).toBe(false);
  });

  it('completes the tour and merges completed steps', async () => {
    const t = convexTest(schema, getModules());
    const { userId, asUser } = await setupAuthenticatedUser(t);

    await asUser.mutation(api.users.recordTutorialStep, { stepId: 'project-overview' });
    await asUser.mutation(api.users.completeTutorialTour, {
      completedSteps: ['documents-list', 'vellum-mascot'],
    });

    const user = await t.run(async (ctx) => await ctx.db.get(userId));

    expect(user?.tutorialState?.hasSeenTour).toBe(true);
    expect(user?.tutorialState?.completedSteps).toEqual(
      expect.arrayContaining(['project-overview', 'documents-list', 'vellum-mascot'])
    );
    expect(user?.tutorialState?.tourCompletedAt).toBeTypeOf('number');
  });

  it('throws for unauthenticated users', async () => {
    const t = convexTest(schema, getModules());

    await expect(t.mutation(api.users.startTutorialTour, {})).rejects.toThrow(
      'Unauthorized: Authentication required'
    );
  });
});
