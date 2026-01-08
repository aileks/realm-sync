import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { api } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import schema from '../schema';

const getModules = () => import.meta.glob('../**/*.ts');

async function createStorageBlob(
  t: ReturnType<typeof convexTest>,
  contentType: string,
  size: number
): Promise<Id<'_storage'>> {
  return await t.run(async (ctx) => {
    const content = new Uint8Array(size);
    const blob = new Blob([content], { type: contentType });
    return await ctx.storage.store(blob);
  });
}

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

describe('users deleteAccount', () => {
  it('removes orphaned user notes after account deletion', async () => {
    const t = convexTest(schema, getModules());
    const { userId, asUser } = await setupAuthenticatedUser(t);
    const now = Date.now();

    const projectId = await t.run(async (ctx) => {
      return await ctx.db.insert('projects', {
        userId,
        name: 'Test Project',
        createdAt: now,
        updatedAt: now,
      });
    });

    const entityId = await t.run(async (ctx) => {
      return await ctx.db.insert('entities', {
        projectId,
        name: 'Test Entity',
        type: 'character',
        aliases: [],
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      });
    });

    const noteId = await t.run(async (ctx) => {
      return await ctx.db.insert('notes', {
        projectId,
        userId,
        title: 'Orphaned note',
        content: 'Left behind after project removal.',
        pinned: false,
        createdAt: now,
        updatedAt: now,
      });
    });

    const entityNoteId = await t.run(async (ctx) => {
      return await ctx.db.insert('entityNotes', {
        entityId,
        projectId,
        userId,
        content: 'Orphaned entity note.',
        createdAt: now,
        updatedAt: now,
      });
    });

    await asUser.mutation(api.projects.remove, { id: projectId });
    await asUser.mutation(api.users.deleteAccount, {
      confirmationPhrase: 'delete my account',
    });

    const remaining = await t.run(async (ctx) => {
      return {
        user: await ctx.db.get(userId),
        note: await ctx.db.get(noteId),
        entityNote: await ctx.db.get(entityNoteId),
      };
    });

    expect(remaining.user).toBeNull();
    expect(remaining.note).toBeNull();
    expect(remaining.entityNote).toBeNull();
  });

  it('deletes the account even if document storage is missing', async () => {
    const t = convexTest(schema, getModules());
    const { userId, asUser } = await setupAuthenticatedUser(t);
    const now = Date.now();
    const storageId = await createStorageBlob(t, 'text/plain', 1024);

    const projectId = await t.run(async (ctx) => {
      return await ctx.db.insert('projects', {
        userId,
        name: 'Storage Project',
        createdAt: now,
        updatedAt: now,
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert('documents', {
        projectId,
        title: 'Stored Doc',
        storageId,
        contentType: 'file',
        orderIndex: 0,
        wordCount: 0,
        createdAt: now,
        updatedAt: now,
        processingStatus: 'pending',
      });
    });

    await t.run(async (ctx) => {
      await ctx.storage.delete(storageId);
    });

    await asUser.mutation(api.users.deleteAccount, {
      confirmationPhrase: 'delete my account',
    });

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user).toBeNull();
  });
});
