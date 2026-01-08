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

async function createProjectWithData(
  t: ReturnType<typeof convexTest>,
  userId: ReturnType<typeof setupAuthenticatedUser> extends Promise<{ userId: infer U }> ? U : never
) {
  return await t.run(async (ctx) => {
    const projectId = await ctx.db.insert('projects', {
      userId,
      name: 'Test World',
      description: 'A fantasy setting',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stats: { documentCount: 1, entityCount: 2, factCount: 1, alertCount: 0, noteCount: 0 },
    });

    const docId = await ctx.db.insert('documents', {
      projectId,
      title: 'Chapter 1',
      content: 'The hero arrived.',
      contentType: 'text',
      orderIndex: 0,
      wordCount: 3,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      processingStatus: 'completed',
    });

    const entityId = await ctx.db.insert('entities', {
      projectId,
      name: 'Aragorn',
      type: 'character',
      description: 'A ranger from the north',
      aliases: ['Strider'],
      status: 'confirmed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert('entities', {
      projectId,
      name: 'Rivendell',
      type: 'location',
      description: 'Elven sanctuary',
      aliases: [],
      status: 'confirmed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert('facts', {
      projectId,
      entityId,
      documentId: docId,
      subject: 'Aragorn',
      predicate: 'is',
      object: 'a ranger',
      confidence: 0.95,
      evidenceSnippet: 'The ranger walked through the forest.',
      status: 'confirmed',
      createdAt: Date.now(),
    });

    return { projectId, docId, entityId };
  });
}

describe('export', () => {
  describe('gatherExportData', () => {
    it('returns null when not authenticated', async () => {
      const t = convexTest(schema, getModules());
      const { userId } = await setupAuthenticatedUser(t);
      const { projectId } = await createProjectWithData(t, userId);

      const result = await t.query(api.export.gatherExportData, { projectId });
      expect(result).toBeNull();
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

      const result = await asUser.query(api.export.gatherExportData, { projectId });
      expect(result).toBeNull();
    });

    it('returns null for project owned by another user', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const otherUserId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Other User',
          email: 'other@example.com',
          createdAt: Date.now(),
        });
      });

      const { projectId } = await createProjectWithData(t, otherUserId);

      const result = await asUser.query(api.export.gatherExportData, { projectId });
      expect(result).toBeNull();
    });

    it('returns export data for owned project', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId } = await createProjectWithData(t, userId);

      const result = await asUser.query(api.export.gatherExportData, { projectId });

      expect(result).not.toBeNull();
      expect(result!.project.name).toBe('Test World');
      expect(result!.project.description).toBe('A fantasy setting');
      expect(result!.documents).toHaveLength(1);
      expect(result!.documents[0].title).toBe('Chapter 1');
      expect(result!.documents[0].content).toBe('The hero arrived.');
      expect(result!.entities).toHaveLength(2);
      expect(result!.facts).toHaveLength(1);
    });

    it('only includes confirmed entities and facts', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, docId, entityId } = await createProjectWithData(t, userId);

      await t.run(async (ctx) => {
        await ctx.db.insert('entities', {
          projectId,
          name: 'Pending Entity',
          type: 'character',
          aliases: [],
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert('facts', {
          projectId,
          entityId,
          documentId: docId,
          subject: 'Test',
          predicate: 'is',
          object: 'pending',
          confidence: 0.5,
          evidenceSnippet: 'test',
          status: 'pending',
          createdAt: Date.now(),
        });
      });

      const result = await asUser.query(api.export.gatherExportData, { projectId });

      expect(result!.entities).toHaveLength(2);
      expect(result!.facts).toHaveLength(1);
    });

    it('filters unrevealed entities and related facts when includeUnrevealed is false', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        return await ctx.db.insert('projects', {
          userId,
          name: 'DM Campaign',
          projectType: 'ttrpg',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          stats: { documentCount: 1, entityCount: 2, factCount: 2, alertCount: 0, noteCount: 0 },
        });
      });

      const docId = await t.run(async (ctx) => {
        return await ctx.db.insert('documents', {
          projectId,
          title: 'Session 1',
          content: 'A secret is revealed.',
          contentType: 'text',
          orderIndex: 0,
          wordCount: 4,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          processingStatus: 'completed',
        });
      });

      const revealedEntityId = await t.run(async (ctx) => {
        return await ctx.db.insert('entities', {
          projectId,
          name: 'Revealed NPC',
          type: 'character',
          aliases: [],
          status: 'confirmed',
          revealedToViewers: true,
          revealedAt: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const hiddenEntityId = await t.run(async (ctx) => {
        return await ctx.db.insert('entities', {
          projectId,
          name: 'Hidden NPC',
          type: 'character',
          aliases: [],
          status: 'confirmed',
          revealedToViewers: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await t.run(async (ctx) => {
        await ctx.db.insert('facts', {
          projectId,
          entityId: revealedEntityId,
          documentId: docId,
          subject: 'Revealed NPC',
          predicate: 'is',
          object: 'known to players',
          confidence: 0.9,
          evidenceSnippet: 'The party meets the NPC.',
          status: 'confirmed',
          createdAt: Date.now(),
        });

        await ctx.db.insert('facts', {
          projectId,
          entityId: hiddenEntityId,
          documentId: docId,
          subject: 'Hidden NPC',
          predicate: 'is',
          object: 'a secret',
          confidence: 0.9,
          evidenceSnippet: 'A secret identity.',
          status: 'confirmed',
          createdAt: Date.now(),
        });
      });

      const result = await asUser.query(api.export.gatherExportData, {
        projectId,
        includeUnrevealed: false,
      });

      expect(result!.entities).toHaveLength(1);
      expect(result!.entities[0].name).toBe('Revealed NPC');
      expect(result!.facts).toHaveLength(1);
      expect(result!.facts[0].subject).toBe('Revealed NPC');
      expect(result!.documents[0].content).toBeUndefined();
    });
  });
});
