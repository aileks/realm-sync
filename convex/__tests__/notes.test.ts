import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { api } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import schema from '../schema';
import { expectConvexErrorCode } from './testUtils';

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

async function setupProject(t: ReturnType<typeof convexTest>, userId: Id<'users'>) {
  return await t.run(async (ctx) => {
    const projectId = await ctx.db.insert('projects', {
      userId,
      name: 'Test Project',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stats: { documentCount: 0, entityCount: 0, factCount: 0, alertCount: 0, noteCount: 0 },
    });
    return { projectId };
  });
}

describe('notes', () => {
  describe('create mutation', () => {
    it('creates note with required fields', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId } = await setupProject(t, userId);

      const noteId = await asUser.mutation(api.notes.create, {
        projectId,
        title: 'Test Note',
        content: 'This is a test note content.',
      });

      const note = await t.run(async (ctx) => ctx.db.get(noteId));
      expect(note).not.toBeNull();
      expect(note?.title).toBe('Test Note');
      expect(note?.content).toBe('This is a test note content.');
      expect(note?.pinned).toBe(false);
      expect(note?.tags).toEqual([]);
    });

    it('creates note with optional fields', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId } = await setupProject(t, userId);

      const noteId = await asUser.mutation(api.notes.create, {
        projectId,
        title: 'Tagged Note',
        content: 'Content with tags.',
        tags: ['session', 'world'],
        pinned: true,
      });

      const note = await t.run(async (ctx) => ctx.db.get(noteId));
      expect(note?.tags).toEqual(['session', 'world']);
      expect(note?.pinned).toBe(true);
    });

    it('increments project noteCount stat', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId } = await setupProject(t, userId);

      await asUser.mutation(api.notes.create, {
        projectId,
        title: 'Note 1',
        content: 'Content',
      });

      const project = await t.run(async (ctx) => ctx.db.get(projectId));
      expect(project?.stats?.noteCount).toBe(1);
    });

    it('throws when not authenticated', async () => {
      const t = convexTest(schema, getModules());
      const { userId } = await setupAuthenticatedUser(t);
      const { projectId } = await setupProject(t, userId);

      await expectConvexErrorCode(
        t.mutation(api.notes.create, {
          projectId,
          title: 'Test',
          content: 'Content',
        }),
        'unauthenticated'
      );
    });

    it('throws when not project owner', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const otherProjectId = await t.run(async (ctx) => {
        const otherUserId = await ctx.db.insert('users', {
          name: 'Other',
          email: 'other@test.com',
          createdAt: Date.now(),
        });
        return await ctx.db.insert('projects', {
          userId: otherUserId,
          name: 'Other Project',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await expectConvexErrorCode(
        asUser.mutation(api.notes.create, {
          projectId: otherProjectId,
          title: 'Test',
          content: 'Content',
        }),
        'unauthorized'
      );
    });
  });

  describe('list query', () => {
    it('returns all notes for project ordered by updatedAt desc', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId } = await setupProject(t, userId);

      await t.run(async (ctx) => {
        await ctx.db.insert('notes', {
          projectId,
          userId,
          title: 'Note 1',
          content: 'First',
          tags: [],
          pinned: false,
          createdAt: Date.now() - 2000,
          updatedAt: Date.now() - 2000,
        });
        await ctx.db.insert('notes', {
          projectId,
          userId,
          title: 'Note 2',
          content: 'Second',
          tags: [],
          pinned: false,
          createdAt: Date.now() - 1000,
          updatedAt: Date.now() - 1000,
        });
      });

      const notes = await asUser.query(api.notes.list, { projectId });
      expect(notes).toHaveLength(2);
      expect(notes[0].title).toBe('Note 2');
      expect(notes[1].title).toBe('Note 1');
    });

    it('returns empty array when not project owner', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const otherProjectId = await t.run(async (ctx) => {
        const otherUserId = await ctx.db.insert('users', {
          name: 'Other',
          email: 'other@test.com',
          createdAt: Date.now(),
        });
        return await ctx.db.insert('projects', {
          userId: otherUserId,
          name: 'Other Project',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const notes = await asUser.query(api.notes.list, { projectId: otherProjectId });
      expect(notes).toEqual([]);
    });
  });

  describe('get query', () => {
    it('returns note by id', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId } = await setupProject(t, userId);

      const noteId = await t.run(async (ctx) => {
        return await ctx.db.insert('notes', {
          projectId,
          userId,
          title: 'Test Note',
          content: 'Content',
          tags: [],
          pinned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const note = await asUser.query(api.notes.get, { id: noteId });
      expect(note).not.toBeNull();
      expect(note?.title).toBe('Test Note');
    });

    it('returns null when note not found', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId } = await setupProject(t, userId);

      const noteId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('notes', {
          projectId,
          userId,
          title: 'Deleted',
          content: 'Content',
          tags: [],
          pinned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await ctx.db.delete(id);
        return id;
      });

      const note = await asUser.query(api.notes.get, { id: noteId });
      expect(note).toBeNull();
    });

    it('returns null when not project owner', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const noteId = await t.run(async (ctx) => {
        const otherUserId = await ctx.db.insert('users', {
          name: 'Other',
          email: 'other@test.com',
          createdAt: Date.now(),
        });
        const pId = await ctx.db.insert('projects', {
          userId: otherUserId,
          name: 'Other Project',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return await ctx.db.insert('notes', {
          projectId: pId,
          userId: otherUserId,
          title: 'Other Note',
          content: 'Content',
          tags: [],
          pinned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const note = await asUser.query(api.notes.get, { id: noteId });
      expect(note).toBeNull();
    });
  });

  describe('update mutation', () => {
    it('updates note fields', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId } = await setupProject(t, userId);

      const noteId = await t.run(async (ctx) => {
        return await ctx.db.insert('notes', {
          projectId,
          userId,
          title: 'Original',
          content: 'Original content',
          tags: [],
          pinned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await asUser.mutation(api.notes.update, {
        id: noteId,
        title: 'Updated Title',
        content: 'Updated content',
        tags: ['new', 'tags'],
        pinned: true,
      });

      const note = await t.run(async (ctx) => ctx.db.get(noteId));
      expect(note?.title).toBe('Updated Title');
      expect(note?.content).toBe('Updated content');
      expect(note?.tags).toEqual(['new', 'tags']);
      expect(note?.pinned).toBe(true);
    });

    it('updates only provided fields', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId } = await setupProject(t, userId);

      const noteId = await t.run(async (ctx) => {
        return await ctx.db.insert('notes', {
          projectId,
          userId,
          title: 'Original',
          content: 'Original content',
          tags: ['old'],
          pinned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await asUser.mutation(api.notes.update, {
        id: noteId,
        title: 'New Title',
      });

      const note = await t.run(async (ctx) => ctx.db.get(noteId));
      expect(note?.title).toBe('New Title');
      expect(note?.content).toBe('Original content');
      expect(note?.tags).toEqual(['old']);
    });

    it('throws when not project owner', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const noteId = await t.run(async (ctx) => {
        const otherUserId = await ctx.db.insert('users', {
          name: 'Other',
          email: 'other@test.com',
          createdAt: Date.now(),
        });
        const pId = await ctx.db.insert('projects', {
          userId: otherUserId,
          name: 'Other',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return await ctx.db.insert('notes', {
          projectId: pId,
          userId: otherUserId,
          title: 'Other',
          content: 'Content',
          tags: [],
          pinned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await expectConvexErrorCode(
        asUser.mutation(api.notes.update, { id: noteId, title: 'Hacked' }),
        'unauthorized'
      );
    });
  });

  describe('remove mutation', () => {
    it('deletes note and decrements project stat', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const { projectId, noteId } = await t.run(async (ctx) => {
        const pId = await ctx.db.insert('projects', {
          userId,
          name: 'Test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          stats: { documentCount: 0, entityCount: 0, factCount: 0, alertCount: 0, noteCount: 1 },
        });
        const nId = await ctx.db.insert('notes', {
          projectId: pId,
          userId,
          title: 'To Delete',
          content: 'Content',
          tags: [],
          pinned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { projectId: pId, noteId: nId };
      });

      await asUser.mutation(api.notes.remove, { id: noteId });

      const note = await t.run(async (ctx) => ctx.db.get(noteId));
      expect(note).toBeNull();

      const project = await t.run(async (ctx) => ctx.db.get(projectId));
      expect(project?.stats?.noteCount).toBe(0);
    });

    it('throws when not project owner', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const noteId = await t.run(async (ctx) => {
        const otherUserId = await ctx.db.insert('users', {
          name: 'Other',
          email: 'other@test.com',
          createdAt: Date.now(),
        });
        const pId = await ctx.db.insert('projects', {
          userId: otherUserId,
          name: 'Other',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return await ctx.db.insert('notes', {
          projectId: pId,
          userId: otherUserId,
          title: 'Other',
          content: 'Content',
          tags: [],
          pinned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await expect(asUser.mutation(api.notes.remove, { id: noteId })).rejects.toThrow(
        /unauthorized/i
      );
    });
  });

  describe('togglePin mutation', () => {
    it('toggles pinned status from false to true', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId } = await setupProject(t, userId);

      const noteId = await t.run(async (ctx) => {
        return await ctx.db.insert('notes', {
          projectId,
          userId,
          title: 'Unpin me',
          content: 'Content',
          tags: [],
          pinned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await asUser.mutation(api.notes.togglePin, { id: noteId });

      const note = await t.run(async (ctx) => ctx.db.get(noteId));
      expect(note?.pinned).toBe(true);
    });

    it('toggles pinned status from true to false', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId } = await setupProject(t, userId);

      const noteId = await t.run(async (ctx) => {
        return await ctx.db.insert('notes', {
          projectId,
          userId,
          title: 'Pin me',
          content: 'Content',
          tags: [],
          pinned: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await asUser.mutation(api.notes.togglePin, { id: noteId });

      const note = await t.run(async (ctx) => ctx.db.get(noteId));
      expect(note?.pinned).toBe(false);
    });
  });

  describe('search query', () => {
    it('returns notes matching search query', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId } = await setupProject(t, userId);

      await t.run(async (ctx) => {
        await ctx.db.insert('notes', {
          projectId,
          userId,
          title: 'Dragon Info',
          content: 'The dragon lives in the mountain.',
          tags: [],
          pinned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await ctx.db.insert('notes', {
          projectId,
          userId,
          title: 'Castle Notes',
          content: 'The castle is large.',
          tags: [],
          pinned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const results = await asUser.query(api.notes.search, {
        projectId,
        query: 'dragon',
      });
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((n) => n.content.includes('dragon'))).toBe(true);
    });
  });
});
