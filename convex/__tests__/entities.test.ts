import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { api } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import schema from '../schema';

const modules = import.meta.glob('../**/*.ts');

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

async function setupProjectWithEntities(t: ReturnType<typeof convexTest>, userId: Id<'users'>) {
  return await t.run(async (ctx) => {
    const projectId = await ctx.db.insert('projects', {
      userId,
      name: 'Test Project',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stats: { documentCount: 0, entityCount: 0, factCount: 0, alertCount: 0 },
    });

    const documentId = await ctx.db.insert('documents', {
      projectId,
      title: 'Test Document',
      content: 'Test content',
      contentType: 'text',
      orderIndex: 0,
      wordCount: 2,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      processingStatus: 'pending',
    });

    const entityId = await ctx.db.insert('entities', {
      projectId,
      name: 'Jon Snow',
      type: 'character',
      description: 'King in the North',
      aliases: ['Lord Snow', 'The White Wolf'],
      firstMentionedIn: documentId,
      status: 'confirmed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { projectId, documentId, entityId };
  });
}

describe('entities', () => {
  describe('create mutation', () => {
    it('creates entity with pending status by default', async () => {
      const t = convexTest(schema, modules);
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        return await ctx.db.insert('projects', {
          userId,
          name: 'Test Project',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          stats: { documentCount: 0, entityCount: 0, factCount: 0, alertCount: 0 },
        });
      });

      const entityId = await asUser.mutation(api.entities.create, {
        projectId,
        name: 'Arya Stark',
        type: 'character',
        description: 'Assassin of House Stark',
        aliases: ['No One', 'Cat of the Canals'],
      });

      const entity = await t.run(async (ctx) => ctx.db.get(entityId));
      expect(entity).not.toBeNull();
      expect(entity?.name).toBe('Arya Stark');
      expect(entity?.type).toBe('character');
      expect(entity?.status).toBe('pending');
      expect(entity?.aliases).toEqual(['No One', 'Cat of the Canals']);
    });

    it('creates entity with confirmed status when specified', async () => {
      const t = convexTest(schema, modules);
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        return await ctx.db.insert('projects', {
          userId,
          name: 'Test Project',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          stats: { documentCount: 0, entityCount: 0, factCount: 0, alertCount: 0 },
        });
      });

      const entityId = await asUser.mutation(api.entities.create, {
        projectId,
        name: 'Winterfell',
        type: 'location',
        status: 'confirmed',
      });

      const entity = await t.run(async (ctx) => ctx.db.get(entityId));
      expect(entity?.status).toBe('confirmed');
    });

    it('increments project entityCount stat', async () => {
      const t = convexTest(schema, modules);
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        return await ctx.db.insert('projects', {
          userId,
          name: 'Test Project',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          stats: { documentCount: 0, entityCount: 0, factCount: 0, alertCount: 0 },
        });
      });

      await asUser.mutation(api.entities.create, {
        projectId,
        name: 'Test Entity',
        type: 'character',
      });

      const project = await t.run(async (ctx) => ctx.db.get(projectId));
      expect(project?.stats?.entityCount).toBe(1);
    });

    it('works on projects without pre-existing stats', async () => {
      const t = convexTest(schema, modules);
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        return await ctx.db.insert('projects', {
          userId,
          name: 'No Stats Project',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await asUser.mutation(api.entities.create, {
        projectId,
        name: 'Test Entity',
        type: 'character',
      });

      const project = await t.run(async (ctx) => ctx.db.get(projectId));
      expect(project?.stats?.entityCount).toBe(1);
    });

    it('throws when not authenticated', async () => {
      const t = convexTest(schema, modules);

      const projectId = await t.run(async (ctx) => {
        const userId = await ctx.db.insert('users', {
          name: 'Owner',
          email: 'owner@test.com',
          createdAt: Date.now(),
        });
        return await ctx.db.insert('projects', {
          userId,
          name: 'Test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await expect(
        t.mutation(api.entities.create, {
          projectId,
          name: 'Test',
          type: 'character',
        })
      ).rejects.toThrow(/unauthorized/i);
    });

    it('throws when not project owner', async () => {
      const t = convexTest(schema, modules);
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

      await expect(
        asUser.mutation(api.entities.create, {
          projectId,
          name: 'Test',
          type: 'character',
        })
      ).rejects.toThrow(/unauthorized/i);
    });
  });

  describe('update mutation', () => {
    it('updates entity fields', async () => {
      const t = convexTest(schema, modules);
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { entityId } = await setupProjectWithEntities(t, userId);

      await asUser.mutation(api.entities.update, {
        id: entityId,
        name: 'Jon Targaryen',
        description: 'Aegon Targaryen, rightful heir',
      });

      const entity = await t.run(async (ctx) => ctx.db.get(entityId));
      expect(entity?.name).toBe('Jon Targaryen');
      expect(entity?.description).toBe('Aegon Targaryen, rightful heir');
    });

    it('confirms pending entity', async () => {
      const t = convexTest(schema, modules);
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const entityId = await t.run(async (ctx) => {
        const pId = await ctx.db.insert('projects', {
          userId,
          name: 'Test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Pending Entity',
          type: 'character',
          aliases: [],
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await asUser.mutation(api.entities.update, {
        id: entityId,
        status: 'confirmed',
      });

      const entity = await t.run(async (ctx) => ctx.db.get(entityId));
      expect(entity?.status).toBe('confirmed');
    });

    it('throws when entity not found', async () => {
      const t = convexTest(schema, modules);
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { entityId } = await setupProjectWithEntities(t, userId);

      await t.run(async (ctx) => ctx.db.delete(entityId));

      await expect(
        asUser.mutation(api.entities.update, {
          id: entityId,
          name: 'Ghost',
        })
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('merge mutation', () => {
    it('merges two entities, combining aliases', async () => {
      const t = convexTest(schema, modules);
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const { projectId, sourceId, targetId, factId } = await t.run(async (ctx) => {
        const pId = await ctx.db.insert('projects', {
          userId,
          name: 'Test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          stats: { documentCount: 0, entityCount: 2, factCount: 1, alertCount: 0 },
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

        const sId = await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Lord Snow',
          type: 'character',
          aliases: ['Bastard of Winterfell'],
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const tId = await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Jon Snow',
          type: 'character',
          aliases: ['The White Wolf'],
          status: 'confirmed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const fId = await ctx.db.insert('facts', {
          projectId: pId,
          entityId: sId,
          documentId: docId,
          subject: 'Lord Snow',
          predicate: 'is',
          object: 'a bastard',
          confidence: 1.0,
          evidenceSnippet: 'Lord Snow is a bastard',
          status: 'confirmed',
          createdAt: Date.now(),
        });

        return { projectId: pId, sourceId: sId, targetId: tId, factId: fId };
      });

      await asUser.mutation(api.entities.merge, {
        sourceId,
        targetId,
      });

      const source = await t.run(async (ctx) => ctx.db.get(sourceId));
      expect(source).toBeNull();

      const target = await t.run(async (ctx) => ctx.db.get(targetId));
      expect(target?.aliases).toContain('Lord Snow');
      expect(target?.aliases).toContain('Bastard of Winterfell');
      expect(target?.aliases).toContain('The White Wolf');

      const fact = await t.run(async (ctx) => ctx.db.get(factId));
      expect(fact?.entityId).toBe(targetId);

      const project = await t.run(async (ctx) => ctx.db.get(projectId));
      expect(project?.stats?.entityCount).toBe(1);
    });

    it('throws when merging entities from different projects', async () => {
      const t = convexTest(schema, modules);
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const { sourceId, targetId } = await t.run(async (ctx) => {
        const p1 = await ctx.db.insert('projects', {
          userId,
          name: 'Project 1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        const p2 = await ctx.db.insert('projects', {
          userId,
          name: 'Project 2',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const sId = await ctx.db.insert('entities', {
          projectId: p1,
          name: 'Entity 1',
          type: 'character',
          aliases: [],
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const tId = await ctx.db.insert('entities', {
          projectId: p2,
          name: 'Entity 2',
          type: 'character',
          aliases: [],
          status: 'confirmed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { sourceId: sId, targetId: tId };
      });

      await expect(asUser.mutation(api.entities.merge, { sourceId, targetId })).rejects.toThrow(
        /same project/i
      );
    });
  });

  describe('listByProject query', () => {
    it('returns all entities for project', async () => {
      const t = convexTest(schema, modules);
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
      const t = convexTest(schema, modules);
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
      const t = convexTest(schema, modules);
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
      const t = convexTest(schema, modules);
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

  describe('getWithFacts query', () => {
    it('returns entity with associated facts', async () => {
      const t = convexTest(schema, modules);
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
      const t = convexTest(schema, modules);
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { entityId } = await setupProjectWithEntities(t, userId);

      await t.run(async (ctx) => ctx.db.delete(entityId));

      const result = await asUser.query(api.entities.getWithFacts, { id: entityId });
      expect(result).toBeNull();
    });

    it('returns null when not project owner', async () => {
      const t = convexTest(schema, modules);
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

  describe('confirm mutation', () => {
    it('confirms a pending entity', async () => {
      const t = convexTest(schema, modules);
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const entityId = await t.run(async (ctx) => {
        const pId = await ctx.db.insert('projects', {
          userId,
          name: 'Test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Pending Entity',
          type: 'character',
          aliases: [],
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      await asUser.mutation(api.entities.confirm, { id: entityId });

      const entity = await t.run(async (ctx) => ctx.db.get(entityId));
      expect(entity?.status).toBe('confirmed');
    });

    it('throws when entity not found', async () => {
      const t = convexTest(schema, modules);
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { entityId } = await setupProjectWithEntities(t, userId);

      await t.run(async (ctx) => ctx.db.delete(entityId));

      await expect(asUser.mutation(api.entities.confirm, { id: entityId })).rejects.toThrow(
        /not found/i
      );
    });
  });

  describe('reject mutation', () => {
    it('rejects entity and cascades to delete facts', async () => {
      const t = convexTest(schema, modules);
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const { projectId, entityId, factId } = await t.run(async (ctx) => {
        const pId = await ctx.db.insert('projects', {
          userId,
          name: 'Test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          stats: { documentCount: 0, entityCount: 1, factCount: 1, alertCount: 0 },
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
          name: 'To Reject',
          type: 'character',
          aliases: [],
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const fId = await ctx.db.insert('facts', {
          projectId: pId,
          entityId: eId,
          documentId: docId,
          subject: 'To Reject',
          predicate: 'has',
          object: 'fact',
          confidence: 1.0,
          evidenceSnippet: 'text',
          status: 'pending',
          createdAt: Date.now(),
        });

        return { projectId: pId, entityId: eId, factId: fId };
      });

      await asUser.mutation(api.entities.reject, { id: entityId });

      const entity = await t.run(async (ctx) => ctx.db.get(entityId));
      expect(entity).toBeNull();

      const fact = await t.run(async (ctx) => ctx.db.get(factId));
      expect(fact).toBeNull();

      const project = await t.run(async (ctx) => ctx.db.get(projectId));
      expect(project?.stats?.entityCount).toBe(0);
      expect(project?.stats?.factCount).toBe(0);
    });
  });

  describe('listPending query', () => {
    it('returns only pending entities for project', async () => {
      const t = convexTest(schema, modules);
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

  describe('findSimilar query', () => {
    it('finds entities with overlapping names', async () => {
      const t = convexTest(schema, modules);
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
      const t = convexTest(schema, modules);
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

  describe('remove mutation', () => {
    it('only decrements factCount for non-rejected facts when cascading', async () => {
      const t = convexTest(schema, modules);
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const { projectId, entityId } = await t.run(async (ctx) => {
        const pId = await ctx.db.insert('projects', {
          userId,
          name: 'Test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          stats: { documentCount: 0, entityCount: 1, factCount: 3, alertCount: 0 },
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
          name: 'Mixed Facts Entity',
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
          subject: 'Confirmed Fact',
          predicate: 'is',
          object: 'counted',
          confidence: 1.0,
          evidenceSnippet: 'text',
          status: 'confirmed',
          createdAt: Date.now(),
        });

        await ctx.db.insert('facts', {
          projectId: pId,
          entityId: eId,
          documentId: docId,
          subject: 'Pending Fact',
          predicate: 'is',
          object: 'also counted',
          confidence: 1.0,
          evidenceSnippet: 'text',
          status: 'pending',
          createdAt: Date.now(),
        });

        await ctx.db.insert('facts', {
          projectId: pId,
          entityId: eId,
          documentId: docId,
          subject: 'Rejected Fact',
          predicate: 'is',
          object: 'NOT counted',
          confidence: 1.0,
          evidenceSnippet: 'text',
          status: 'rejected',
          createdAt: Date.now(),
        });

        return { projectId: pId, entityId: eId };
      });

      await asUser.mutation(api.entities.remove, { id: entityId });

      const project = await t.run(async (ctx) => ctx.db.get(projectId));
      expect(project?.stats?.entityCount).toBe(0);
      expect(project?.stats?.factCount).toBe(1);
    });

    it('deletes entity and cascades to facts', async () => {
      const t = convexTest(schema, modules);
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const { projectId, entityId, factId } = await t.run(async (ctx) => {
        const pId = await ctx.db.insert('projects', {
          userId,
          name: 'Test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          stats: { documentCount: 0, entityCount: 1, factCount: 1, alertCount: 0 },
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
          name: 'To Delete',
          type: 'character',
          aliases: [],
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const fId = await ctx.db.insert('facts', {
          projectId: pId,
          entityId: eId,
          documentId: docId,
          subject: 'To Delete',
          predicate: 'exists',
          object: 'temporarily',
          confidence: 1.0,
          evidenceSnippet: 'text',
          status: 'pending',
          createdAt: Date.now(),
        });

        return { projectId: pId, entityId: eId, factId: fId };
      });

      await asUser.mutation(api.entities.remove, { id: entityId });

      const entity = await t.run(async (ctx) => ctx.db.get(entityId));
      expect(entity).toBeNull();

      const fact = await t.run(async (ctx) => ctx.db.get(factId));
      expect(fact).toBeNull();

      const project = await t.run(async (ctx) => ctx.db.get(projectId));
      expect(project?.stats?.entityCount).toBe(0);
      expect(project?.stats?.factCount).toBe(0);
    });
  });
});
