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

describe('projects', () => {
  describe('list query', () => {
    it('returns empty array when user has no projects', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const projects = await asUser.query(api.projects.list, {});
      expect(projects).toEqual([]);
    });

    it('returns empty array when not authenticated', async () => {
      const t = convexTest(schema, getModules());
      const projects = await t.query(api.projects.list, {});
      expect(projects).toEqual([]);
    });

    it('returns only user projects, not other users', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      await t.run(async (ctx) => {
        await ctx.db.insert('projects', {
          userId,
          name: 'My Project',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const otherUserId = await ctx.db.insert('users', {
          name: 'Other',
          email: 'other@example.com',
          createdAt: Date.now(),
        });
        await ctx.db.insert('projects', {
          userId: otherUserId,
          name: 'Other Project',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const projects = await asUser.query(api.projects.list, {});
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('My Project');
    });
  });

  describe('get query', () => {
    it('returns project when user is owner', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        return await ctx.db.insert('projects', {
          userId,
          name: 'Test Project',
          description: 'A test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const project = await asUser.query(api.projects.get, { id: projectId });
      expect(project).not.toBeNull();
      expect(project?.name).toBe('Test Project');
      expect(project?.description).toBe('A test');
    });

    it('returns null when user is not owner', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        const otherUserId = await ctx.db.insert('users', {
          name: 'Other',
          email: 'other@example.com',
          createdAt: Date.now(),
        });
        return await ctx.db.insert('projects', {
          userId: otherUserId,
          name: 'Other Project',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const project = await asUser.query(api.projects.get, { id: projectId });
      expect(project).toBeNull();
    });

    it('returns null for non-existent project', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('projects', {
          userId,
          name: 'Temp',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await ctx.db.delete(id);
        return id;
      });

      const project = await asUser.query(api.projects.get, { id: projectId });
      expect(project).toBeNull();
    });
  });

  describe('create mutation', () => {
    it('creates project with initialized stats', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const projectId = await asUser.mutation(api.projects.create, {
        name: 'New Project',
        description: 'My description',
      });

      const project = await asUser.query(api.projects.get, { id: projectId });
      expect(project).not.toBeNull();
      expect(project?.name).toBe('New Project');
      expect(project?.description).toBe('My description');
      expect(project?.stats).toEqual({
        documentCount: 0,
        entityCount: 0,
        factCount: 0,
        alertCount: 0,
      });
    });

    it('throws when not authenticated', async () => {
      const t = convexTest(schema, getModules());

      await expect(t.mutation(api.projects.create, { name: 'Test' })).rejects.toThrow(
        /unauthorized/i
      );
    });

    it('creates project without description', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const projectId = await asUser.mutation(api.projects.create, {
        name: 'No Description',
      });

      const project = await asUser.query(api.projects.get, { id: projectId });
      expect(project?.name).toBe('No Description');
      expect(project?.description).toBeUndefined();
    });
  });

  describe('update mutation', () => {
    it('updates project name', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        return await ctx.db.insert('projects', {
          userId,
          name: 'Original',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await asUser.mutation(api.projects.update, {
        id: projectId,
        name: 'Updated',
      });

      const project = await asUser.query(api.projects.get, { id: projectId });
      expect(project?.name).toBe('Updated');
    });

    it('throws when not owner', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        const otherUserId = await ctx.db.insert('users', {
          name: 'Other',
          email: 'other@example.com',
          createdAt: Date.now(),
        });
        return await ctx.db.insert('projects', {
          userId: otherUserId,
          name: 'Other Project',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await expect(
        asUser.mutation(api.projects.update, { id: projectId, name: 'Hacked' })
      ).rejects.toThrow(/unauthorized/i);
    });

    it('throws when project not found', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('projects', {
          userId,
          name: 'Temp',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await ctx.db.delete(id);
        return id;
      });

      await expect(
        asUser.mutation(api.projects.update, { id: projectId, name: 'Ghost' })
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('remove mutation', () => {
    it('deletes project', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        return await ctx.db.insert('projects', {
          userId,
          name: 'To Delete',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await asUser.mutation(api.projects.remove, { id: projectId });

      const project = await asUser.query(api.projects.get, { id: projectId });
      expect(project).toBeNull();
    });

    it('cascades delete to documents', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const { projectId, documentId } = await t.run(async (ctx) => {
        const pId = await ctx.db.insert('projects', {
          userId,
          name: 'With Docs',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const dId = await ctx.db.insert('documents', {
          projectId: pId,
          title: 'Test Doc',
          contentType: 'text',
          orderIndex: 0,
          wordCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          processingStatus: 'pending',
        });

        return { projectId: pId, documentId: dId };
      });

      await asUser.mutation(api.projects.remove, { id: projectId });

      const doc = await asUser.query(api.documents.get, { id: documentId });
      expect(doc).toBeNull();
    });

    it('throws when not owner', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        const otherUserId = await ctx.db.insert('users', {
          name: 'Other',
          email: 'other@example.com',
          createdAt: Date.now(),
        });
        return await ctx.db.insert('projects', {
          userId: otherUserId,
          name: 'Protected',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await expect(asUser.mutation(api.projects.remove, { id: projectId })).rejects.toThrow(
        /unauthorized/i
      );
    });
  });

  describe('updateStats mutation', () => {
    it('updates stats partially', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        return await ctx.db.insert('projects', {
          userId,
          name: 'Stats Test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          stats: {
            documentCount: 5,
            entityCount: 10,
            factCount: 20,
            alertCount: 2,
          },
        });
      });

      await asUser.mutation(api.projects.updateStats, {
        id: projectId,
        stats: { documentCount: 6 },
      });

      const project = await asUser.query(api.projects.get, { id: projectId });
      expect(project?.stats).toEqual({
        documentCount: 6,
        entityCount: 10,
        factCount: 20,
        alertCount: 2,
      });
    });
  });

  describe('getCanonStats query', () => {
    it('returns null for non-existent project', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('projects', {
          userId,
          name: 'Temp',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await ctx.db.delete(id);
        return id;
      });

      const stats = await asUser.query(api.projects.getCanonStats, { projectId });
      expect(stats).toBeNull();
    });

    it('returns null when user is not owner', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        const otherUserId = await ctx.db.insert('users', {
          name: 'Other',
          email: 'other@example.com',
          createdAt: Date.now(),
        });
        return await ctx.db.insert('projects', {
          userId: otherUserId,
          name: 'Other Project',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const stats = await asUser.query(api.projects.getCanonStats, { projectId });
      expect(stats).toBeNull();
    });

    it('returns zero counts for empty project', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        return await ctx.db.insert('projects', {
          userId,
          name: 'Empty Project',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const stats = await asUser.query(api.projects.getCanonStats, { projectId });
      expect(stats).toEqual({
        totalEntities: 0,
        totalFacts: 0,
        totalDocuments: 0,
        processedDocuments: 0,
        coverage: 0,
        entityCounts: {
          character: 0,
          location: 0,
          item: 0,
          concept: 0,
          event: 0,
        },
      });
    });

    it('returns accurate counts with confirmed entities and facts', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        const pId = await ctx.db.insert('projects', {
          userId,
          name: 'Populated Project',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const docId = await ctx.db.insert('documents', {
          projectId: pId,
          title: 'Chapter 1',
          contentType: 'text',
          orderIndex: 0,
          wordCount: 500,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          processingStatus: 'completed',
        });

        await ctx.db.insert('documents', {
          projectId: pId,
          title: 'Chapter 2',
          contentType: 'text',
          orderIndex: 1,
          wordCount: 300,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          processingStatus: 'pending',
        });

        const entityId = await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Jon Snow',
          type: 'character',
          aliases: [],
          status: 'confirmed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Winterfell',
          type: 'location',
          aliases: [],
          status: 'confirmed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Pending Entity',
          type: 'item',
          aliases: [],
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert('facts', {
          projectId: pId,
          entityId,
          documentId: docId,
          subject: 'Jon Snow',
          predicate: 'has_title',
          object: 'Lord Commander',
          confidence: 0.95,
          evidenceSnippet: 'Jon Snow became Lord Commander',
          status: 'confirmed',
          createdAt: Date.now(),
        });

        await ctx.db.insert('facts', {
          projectId: pId,
          entityId,
          documentId: docId,
          subject: 'Jon Snow',
          predicate: 'has_trait',
          object: 'Knows nothing',
          confidence: 0.9,
          evidenceSnippet: 'You know nothing, Jon Snow',
          status: 'pending',
          createdAt: Date.now(),
        });

        return pId;
      });

      const stats = await asUser.query(api.projects.getCanonStats, { projectId });
      expect(stats).toEqual({
        totalEntities: 2,
        totalFacts: 1,
        totalDocuments: 2,
        processedDocuments: 1,
        coverage: 50,
        entityCounts: {
          character: 1,
          location: 1,
          item: 0,
          concept: 0,
          event: 0,
        },
      });
    });
  });
});
