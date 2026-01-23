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

async function setupProjectWithEntity(t: ReturnType<typeof convexTest>, userId: Id<'users'>) {
  return await t.run(async (ctx) => {
    const projectId = await ctx.db.insert('projects', {
      userId,
      name: 'Test Project',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stats: { documentCount: 0, entityCount: 1, factCount: 0, alertCount: 0, noteCount: 0 },
    });
    const entityId = await ctx.db.insert('entities', {
      projectId,
      name: 'Test Entity',
      type: 'character',
      aliases: [],
      status: 'confirmed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { projectId, entityId };
  });
}

describe('entityNotes', () => {
  describe('create mutation', () => {
    it('creates entity note with required fields', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, entityId } = await setupProjectWithEntity(t, userId);

      const noteId = await asUser.mutation(api.entityNotes.create, {
        entityId,
        content: 'This is a note about the entity.',
      });

      const note = await t.run(async (ctx) => ctx.db.get(noteId));
      expect(note).not.toBeNull();
      expect(note?.entityId).toBe(entityId);
      expect(note?.projectId).toBe(projectId);
      expect(note?.userId).toBe(userId);
      expect(note?.content).toBe('This is a note about the entity.');
    });

    it('throws when not authenticated', async () => {
      const t = convexTest(schema, getModules());
      const { userId } = await setupAuthenticatedUser(t);
      const { entityId } = await setupProjectWithEntity(t, userId);

      await expectConvexErrorCode(
        t.mutation(api.entityNotes.create, {
          entityId,
          content: 'Content',
        }),
        'unauthenticated'
      );
    });

    it('throws when not project owner', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const otherEntityId = await t.run(async (ctx) => {
        const otherUserId = await ctx.db.insert('users', {
          name: 'Other',
          email: 'other@test.com',
          createdAt: Date.now(),
        });
        const otherProjectId = await ctx.db.insert('projects', {
          userId: otherUserId,
          name: 'Other Project',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return await ctx.db.insert('entities', {
          projectId: otherProjectId,
          name: 'Other Entity',
          type: 'location',
          aliases: [],
          status: 'confirmed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await expectConvexErrorCode(
        asUser.mutation(api.entityNotes.create, {
          entityId: otherEntityId,
          content: 'Content',
        }),
        'unauthorized'
      );
    });

    it('throws when entity not found', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { entityId } = await setupProjectWithEntity(t, userId);

      await t.run(async (ctx) => ctx.db.delete(entityId));

      await expect(
        asUser.mutation(api.entityNotes.create, {
          entityId,
          content: 'Content',
        })
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('list query', () => {
    it('returns all notes for entity ordered by creation desc', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, entityId } = await setupProjectWithEntity(t, userId);

      await t.run(async (ctx) => {
        await ctx.db.insert('entityNotes', {
          entityId,
          projectId,
          userId,
          content: 'First note',
          createdAt: Date.now() - 2000,
          updatedAt: Date.now() - 2000,
        });
        await ctx.db.insert('entityNotes', {
          entityId,
          projectId,
          userId,
          content: 'Second note',
          createdAt: Date.now() - 1000,
          updatedAt: Date.now() - 1000,
        });
      });

      const notes = await asUser.query(api.entityNotes.list, { entityId });
      expect(notes).toHaveLength(2);
      expect(notes[0].content).toBe('Second note');
      expect(notes[1].content).toBe('First note');
    });

    it('returns empty array when not project owner', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const otherEntityId = await t.run(async (ctx) => {
        const otherUserId = await ctx.db.insert('users', {
          name: 'Other',
          email: 'other@test.com',
          createdAt: Date.now(),
        });
        const otherProjectId = await ctx.db.insert('projects', {
          userId: otherUserId,
          name: 'Other Project',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return await ctx.db.insert('entities', {
          projectId: otherProjectId,
          name: 'Other Entity',
          type: 'location',
          aliases: [],
          status: 'confirmed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const notes = await asUser.query(api.entityNotes.list, { entityId: otherEntityId });
      expect(notes).toEqual([]);
    });
  });

  describe('get query', () => {
    it('returns note by id', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, entityId } = await setupProjectWithEntity(t, userId);

      const noteId = await t.run(async (ctx) => {
        return await ctx.db.insert('entityNotes', {
          entityId,
          projectId,
          userId,
          content: 'Test note',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const note = await asUser.query(api.entityNotes.get, { id: noteId });
      expect(note).not.toBeNull();
      expect(note?.content).toBe('Test note');
    });

    it('returns null when note not found', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, entityId } = await setupProjectWithEntity(t, userId);

      const noteId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('entityNotes', {
          entityId,
          projectId,
          userId,
          content: 'Deleted',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await ctx.db.delete(id);
        return id;
      });

      const note = await asUser.query(api.entityNotes.get, { id: noteId });
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
        const eId = await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Other Entity',
          type: 'item',
          aliases: [],
          status: 'confirmed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return await ctx.db.insert('entityNotes', {
          entityId: eId,
          projectId: pId,
          userId: otherUserId,
          content: 'Other note',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const note = await asUser.query(api.entityNotes.get, { id: noteId });
      expect(note).toBeNull();
    });
  });

  describe('update mutation', () => {
    it('updates note content', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, entityId } = await setupProjectWithEntity(t, userId);

      const noteId = await t.run(async (ctx) => {
        return await ctx.db.insert('entityNotes', {
          entityId,
          projectId,
          userId,
          content: 'Original content',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await asUser.mutation(api.entityNotes.update, {
        id: noteId,
        content: 'Updated content',
      });

      const note = await t.run(async (ctx) => ctx.db.get(noteId));
      expect(note?.content).toBe('Updated content');
    });

    it('updates updatedAt timestamp', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, entityId } = await setupProjectWithEntity(t, userId);

      const originalUpdatedAt = Date.now() - 10000;
      const noteId = await t.run(async (ctx) => {
        return await ctx.db.insert('entityNotes', {
          entityId,
          projectId,
          userId,
          content: 'Original',
          createdAt: originalUpdatedAt,
          updatedAt: originalUpdatedAt,
        });
      });

      await asUser.mutation(api.entityNotes.update, {
        id: noteId,
        content: 'New content',
      });

      const note = await t.run(async (ctx) => ctx.db.get(noteId));
      expect(note?.updatedAt).toBeGreaterThan(originalUpdatedAt);
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
        const eId = await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Entity',
          type: 'concept',
          aliases: [],
          status: 'confirmed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return await ctx.db.insert('entityNotes', {
          entityId: eId,
          projectId: pId,
          userId: otherUserId,
          content: 'Other',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await expectConvexErrorCode(
        asUser.mutation(api.entityNotes.update, { id: noteId, content: 'Hacked' }),
        'unauthorized'
      );
    });
  });

  describe('remove mutation', () => {
    it('deletes note', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, entityId } = await setupProjectWithEntity(t, userId);

      const noteId = await t.run(async (ctx) => {
        return await ctx.db.insert('entityNotes', {
          entityId,
          projectId,
          userId,
          content: 'To delete',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await asUser.mutation(api.entityNotes.remove, { id: noteId });

      const note = await t.run(async (ctx) => ctx.db.get(noteId));
      expect(note).toBeNull();
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
        const eId = await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Entity',
          type: 'event',
          aliases: [],
          status: 'confirmed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return await ctx.db.insert('entityNotes', {
          entityId: eId,
          projectId: pId,
          userId: otherUserId,
          content: 'Other',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await expect(asUser.mutation(api.entityNotes.remove, { id: noteId })).rejects.toThrow(
        /unauthorized/i
      );
    });
  });
});
