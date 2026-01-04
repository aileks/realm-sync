import { describe, it, expect } from 'vitest';
import { api } from '../../_generated/api';
import { createTestContext, setupAuthenticatedUser, setupProjectWithEntities } from './helpers';

describe('entities queries', () => {
  describe('listByProject', () => {
    it('returns all entities for project', async () => {
      const t = createTestContext();
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        const pId = await ctx.db.insert('projects', {
          userId,
          name: 'Test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Character 1',
          type: 'character',
          aliases: [],
          status: 'confirmed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Location 1',
          type: 'location',
          aliases: [],
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return pId;
      });

      const entities = await asUser.query(api.entities.listByProject, { projectId });
      expect(entities).toHaveLength(2);
    });

    it('filters by type when provided', async () => {
      const t = createTestContext();
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        const pId = await ctx.db.insert('projects', {
          userId,
          name: 'Test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Character 1',
          type: 'character',
          aliases: [],
          status: 'confirmed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Location 1',
          type: 'location',
          aliases: [],
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return pId;
      });

      const entities = await asUser.query(api.entities.listByProject, {
        projectId,
        type: 'character',
      });
      expect(entities).toHaveLength(1);
      expect(entities[0].type).toBe('character');
    });

    it('filters by status when provided', async () => {
      const t = createTestContext();
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        const pId = await ctx.db.insert('projects', {
          userId,
          name: 'Test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Confirmed Entity',
          type: 'character',
          aliases: [],
          status: 'confirmed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Pending Entity',
          type: 'character',
          aliases: [],
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return pId;
      });

      const entities = await asUser.query(api.entities.listByProject, {
        projectId,
        status: 'pending',
      });
      expect(entities).toHaveLength(1);
      expect(entities[0].name).toBe('Pending Entity');
    });

    it('returns empty array when not project owner', async () => {
      const t = createTestContext();
      const { asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
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

      const entities = await asUser.query(api.entities.listByProject, { projectId });
      expect(entities).toEqual([]);
    });
  });

  describe('getWithFacts', () => {
    it('returns entity with associated facts', async () => {
      const t = createTestContext();
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const entityId = await t.run(async (ctx) => {
        const pId = await ctx.db.insert('projects', {
          userId,
          name: 'Test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const docId = await ctx.db.insert('documents', {
          projectId: pId,
          title: 'Doc',
          contentType: 'text',
          orderIndex: 0,
          wordCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          processingStatus: 'completed',
        });

        const eId = await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Jon Snow',
          type: 'character',
          aliases: [],
          status: 'confirmed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert('facts', {
          projectId: pId,
          entityId: eId,
          documentId: docId,
          subject: 'Jon Snow',
          predicate: 'is',
          object: 'King in the North',
          confidence: 1.0,
          evidenceSnippet: '"Jon Snow is King in the North"',
          status: 'confirmed',
          createdAt: Date.now(),
        });

        await ctx.db.insert('facts', {
          projectId: pId,
          entityId: eId,
          documentId: docId,
          subject: 'Jon Snow',
          predicate: 'knows',
          object: 'nothing',
          confidence: 0.9,
          evidenceSnippet: '"You know nothing, Jon Snow"',
          status: 'pending',
          createdAt: Date.now(),
        });

        return eId;
      });

      const result = await asUser.query(api.entities.getWithFacts, { id: entityId });
      expect(result).not.toBeNull();
      expect(result?.entity.name).toBe('Jon Snow');
      expect(result?.facts).toHaveLength(2);
    });

    it('returns null when entity not found', async () => {
      const t = createTestContext();
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { entityId } = await setupProjectWithEntities(t, userId);

      await t.run(async (ctx) => ctx.db.delete(entityId));

      const result = await asUser.query(api.entities.getWithFacts, { id: entityId });
      expect(result).toBeNull();
    });

    it('returns null when not project owner', async () => {
      const t = createTestContext();
      const { asUser } = await setupAuthenticatedUser(t);

      const entityId = await t.run(async (ctx) => {
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
        return await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Secret Entity',
          type: 'character',
          aliases: [],
          status: 'confirmed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const result = await asUser.query(api.entities.getWithFacts, { id: entityId });
      expect(result).toBeNull();
    });
  });

  describe('listPending', () => {
    it('returns only pending entities for project', async () => {
      const t = createTestContext();
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        const pId = await ctx.db.insert('projects', {
          userId,
          name: 'Test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Pending 1',
          type: 'character',
          aliases: [],
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Pending 2',
          type: 'location',
          aliases: [],
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Confirmed',
          type: 'item',
          aliases: [],
          status: 'confirmed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return pId;
      });

      const pending = await asUser.query(api.entities.listPending, { projectId });
      expect(pending).toHaveLength(2);
      expect(pending.every((e) => e.status === 'pending')).toBe(true);
    });
  });

  describe('findSimilar', () => {
    it('finds entities with overlapping names', async () => {
      const t = createTestContext();
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const { projectId, entityId } = await t.run(async (ctx) => {
        const pId = await ctx.db.insert('projects', {
          userId,
          name: 'Test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const eId = await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Jon',
          type: 'character',
          aliases: [],
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Jon Snow',
          type: 'character',
          aliases: ['Lord Snow'],
          status: 'confirmed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Daenerys',
          type: 'character',
          aliases: [],
          status: 'confirmed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { projectId: pId, entityId: eId };
      });

      const similar = await asUser.query(api.entities.findSimilar, {
        projectId,
        name: 'Jon',
        excludeId: entityId,
      });

      expect(similar).toHaveLength(1);
      expect(similar[0].name).toBe('Jon Snow');
    });

    it('finds entities by alias match', async () => {
      const t = createTestContext();
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        const pId = await ctx.db.insert('projects', {
          userId,
          name: 'Test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Jon Snow',
          type: 'character',
          aliases: ['Lord Snow', 'The White Wolf'],
          status: 'confirmed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return pId;
      });

      const similar = await asUser.query(api.entities.findSimilar, {
        projectId,
        name: 'Lord Snow',
      });

      expect(similar).toHaveLength(1);
      expect(similar[0].name).toBe('Jon Snow');
    });
  });
});
