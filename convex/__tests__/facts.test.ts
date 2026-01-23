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

async function setupProjectWithEntityAndDoc(t: ReturnType<typeof convexTest>, userId: Id<'users'>) {
  return await t.run(async (ctx) => {
    const projectId = await ctx.db.insert('projects', {
      userId,
      name: 'Test Project',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stats: { documentCount: 1, entityCount: 1, factCount: 0, alertCount: 0, noteCount: 0 },
    });

    const documentId = await ctx.db.insert('documents', {
      projectId,
      title: 'Test Document',
      content: 'Jon Snow is King in the North.',
      contentType: 'text',
      orderIndex: 0,
      wordCount: 6,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      processingStatus: 'completed',
    });

    const entityId = await ctx.db.insert('entities', {
      projectId,
      name: 'Jon Snow',
      type: 'character',
      aliases: [],
      status: 'confirmed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { projectId, documentId, entityId };
  });
}

describe('facts', () => {
  describe('create mutation', () => {
    it('creates fact with pending status by default', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, documentId, entityId } = await setupProjectWithEntityAndDoc(t, userId);

      const factId = await asUser.mutation(api.facts.create, {
        projectId,
        entityId,
        documentId,
        subject: 'Jon Snow',
        predicate: 'is',
        object: 'King in the North',
        confidence: 1.0,
        evidenceSnippet: '"Jon Snow is King in the North"',
      });

      const fact = await t.run(async (ctx) => ctx.db.get(factId));
      expect(fact).not.toBeNull();
      expect(fact?.subject).toBe('Jon Snow');
      expect(fact?.predicate).toBe('is');
      expect(fact?.object).toBe('King in the North');
      expect(fact?.status).toBe('pending');
      expect(fact?.confidence).toBe(1.0);
    });

    it('creates fact with confirmed status when specified', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, documentId, entityId } = await setupProjectWithEntityAndDoc(t, userId);

      const factId = await asUser.mutation(api.facts.create, {
        projectId,
        entityId,
        documentId,
        subject: 'Jon Snow',
        predicate: 'knows',
        object: 'nothing',
        confidence: 0.9,
        evidenceSnippet: '"You know nothing, Jon Snow"',
        status: 'confirmed',
      });

      const fact = await t.run(async (ctx) => ctx.db.get(factId));
      expect(fact?.status).toBe('confirmed');
    });

    it('increments project factCount stat', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, documentId, entityId } = await setupProjectWithEntityAndDoc(t, userId);

      await asUser.mutation(api.facts.create, {
        projectId,
        entityId,
        documentId,
        subject: 'Jon Snow',
        predicate: 'is',
        object: 'a Stark',
        confidence: 0.8,
        evidenceSnippet: 'text',
      });

      const project = await t.run(async (ctx) => ctx.db.get(projectId));
      expect(project?.stats?.factCount).toBe(1);
    });

    it('works on projects without pre-existing stats', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const { projectId, documentId, entityId } = await t.run(async (ctx) => {
        const pId = await ctx.db.insert('projects', {
          userId,
          name: 'No Stats Project',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        const dId = await ctx.db.insert('documents', {
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
          name: 'Entity',
          type: 'character',
          aliases: [],
          status: 'confirmed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { projectId: pId, documentId: dId, entityId: eId };
      });

      await asUser.mutation(api.facts.create, {
        projectId,
        entityId,
        documentId,
        subject: 'Test',
        predicate: 'is',
        object: 'fact',
        confidence: 1.0,
        evidenceSnippet: 'text',
      });

      const project = await t.run(async (ctx) => ctx.db.get(projectId));
      expect(project?.stats?.factCount).toBe(1);
    });

    it('stores temporal bound when provided', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, documentId, entityId } = await setupProjectWithEntityAndDoc(t, userId);

      const factId = await asUser.mutation(api.facts.create, {
        projectId,
        entityId,
        documentId,
        subject: 'Jon Snow',
        predicate: 'became',
        object: 'Lord Commander',
        confidence: 1.0,
        evidenceSnippet: 'text',
        temporalBound: { type: 'point', value: 'Season 5' },
      });

      const fact = await t.run(async (ctx) => ctx.db.get(factId));
      expect(fact?.temporalBound).toEqual({ type: 'point', value: 'Season 5' });
    });

    it('throws when not authenticated', async () => {
      const t = convexTest(schema, getModules());
      const { userId } = await setupAuthenticatedUser(t);
      const { projectId, documentId, entityId } = await setupProjectWithEntityAndDoc(t, userId);

      await expectConvexErrorCode(
        t.mutation(api.facts.create, {
          projectId,
          entityId,
          documentId,
          subject: 'Test',
          predicate: 'is',
          object: 'test',
          confidence: 1.0,
          evidenceSnippet: 'text',
        }),
        'unauthenticated'
      );
    });

    it('throws when not project owner', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const { projectId, documentId, entityId } = await t.run(async (ctx) => {
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
        const dId = await ctx.db.insert('documents', {
          projectId: pId,
          title: 'Doc',
          contentType: 'text',
          orderIndex: 0,
          wordCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          processingStatus: 'pending',
        });
        const eId = await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Entity',
          type: 'character',
          aliases: [],
          status: 'confirmed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { projectId: pId, documentId: dId, entityId: eId };
      });

      await expectConvexErrorCode(
        asUser.mutation(api.facts.create, {
          projectId,
          entityId,
          documentId,
          subject: 'Test',
          predicate: 'is',
          object: 'test',
          confidence: 1.0,
          evidenceSnippet: 'text',
        }),
        'unauthorized'
      );
    });
  });

  describe('confirm mutation', () => {
    it('changes status from pending to confirmed', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, documentId, entityId } = await setupProjectWithEntityAndDoc(t, userId);

      const factId = await t.run(async (ctx) => {
        return await ctx.db.insert('facts', {
          projectId,
          entityId,
          documentId,
          subject: 'Jon Snow',
          predicate: 'is',
          object: 'brave',
          confidence: 0.9,
          evidenceSnippet: 'text',
          status: 'pending',
          createdAt: Date.now(),
        });
      });

      await asUser.mutation(api.facts.confirm, { id: factId });

      const fact = await t.run(async (ctx) => ctx.db.get(factId));
      expect(fact?.status).toBe('confirmed');
    });

    it('throws when fact not found', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, documentId, entityId } = await setupProjectWithEntityAndDoc(t, userId);

      const factId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('facts', {
          projectId,
          entityId,
          documentId,
          subject: 'Test',
          predicate: 'is',
          object: 'deleted',
          confidence: 1.0,
          evidenceSnippet: 'text',
          status: 'pending',
          createdAt: Date.now(),
        });
        await ctx.db.delete(id);
        return id;
      });

      await expect(asUser.mutation(api.facts.confirm, { id: factId })).rejects.toThrow(
        /not found/i
      );
    });
  });

  describe('reject mutation', () => {
    it('changes status from pending to rejected', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, documentId, entityId } = await setupProjectWithEntityAndDoc(t, userId);

      const factId = await t.run(async (ctx) => {
        return await ctx.db.insert('facts', {
          projectId,
          entityId,
          documentId,
          subject: 'Jon Snow',
          predicate: 'is',
          object: 'wrong info',
          confidence: 0.5,
          evidenceSnippet: 'text',
          status: 'pending',
          createdAt: Date.now(),
        });
      });

      await asUser.mutation(api.facts.reject, { id: factId });

      const fact = await t.run(async (ctx) => ctx.db.get(factId));
      expect(fact?.status).toBe('rejected');
    });

    it('decrements project factCount when rejecting fact', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const { projectId, factId } = await t.run(async (ctx) => {
        const pId = await ctx.db.insert('projects', {
          userId,
          name: 'Test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          stats: { documentCount: 1, entityCount: 1, factCount: 1, alertCount: 0, noteCount: 0 },
        });
        const dId = await ctx.db.insert('documents', {
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
          name: 'Entity',
          type: 'character',
          aliases: [],
          status: 'confirmed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        const fId = await ctx.db.insert('facts', {
          projectId: pId,
          entityId: eId,
          documentId: dId,
          subject: 'Entity',
          predicate: 'is',
          object: 'something',
          confidence: 1.0,
          evidenceSnippet: 'text',
          status: 'confirmed',
          createdAt: Date.now(),
        });
        return { projectId: pId, factId: fId };
      });

      await asUser.mutation(api.facts.reject, { id: factId });

      const project = await t.run(async (ctx) => ctx.db.get(projectId));
      expect(project?.stats?.factCount).toBe(0);
    });
  });

  describe('listByEntity query', () => {
    it('returns all facts for entity', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, documentId, entityId } = await setupProjectWithEntityAndDoc(t, userId);

      await t.run(async (ctx) => {
        await ctx.db.insert('facts', {
          projectId,
          entityId,
          documentId,
          subject: 'Jon Snow',
          predicate: 'is',
          object: 'brave',
          confidence: 1.0,
          evidenceSnippet: 'text',
          status: 'confirmed',
          createdAt: Date.now(),
        });
        await ctx.db.insert('facts', {
          projectId,
          entityId,
          documentId,
          subject: 'Jon Snow',
          predicate: 'knows',
          object: 'nothing',
          confidence: 0.9,
          evidenceSnippet: 'text',
          status: 'pending',
          createdAt: Date.now(),
        });
      });

      const facts = await asUser.query(api.facts.listByEntity, { entityId });
      expect(facts).toHaveLength(2);
    });

    it('filters by status when provided', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, documentId, entityId } = await setupProjectWithEntityAndDoc(t, userId);

      await t.run(async (ctx) => {
        await ctx.db.insert('facts', {
          projectId,
          entityId,
          documentId,
          subject: 'Jon Snow',
          predicate: 'is',
          object: 'confirmed fact',
          confidence: 1.0,
          evidenceSnippet: 'text',
          status: 'confirmed',
          createdAt: Date.now(),
        });
        await ctx.db.insert('facts', {
          projectId,
          entityId,
          documentId,
          subject: 'Jon Snow',
          predicate: 'is',
          object: 'pending fact',
          confidence: 0.9,
          evidenceSnippet: 'text',
          status: 'pending',
          createdAt: Date.now(),
        });
      });

      const facts = await asUser.query(api.facts.listByEntity, {
        entityId,
        status: 'confirmed',
      });
      expect(facts).toHaveLength(1);
      expect(facts[0].object).toBe('confirmed fact');
    });

    it('returns empty array when not project owner', async () => {
      const t = convexTest(schema, getModules());
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
          name: 'Entity',
          type: 'character',
          aliases: [],
          status: 'confirmed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const facts = await asUser.query(api.facts.listByEntity, { entityId });
      expect(facts).toEqual([]);
    });
  });

  describe('listPending query', () => {
    it('returns all pending facts for project', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, documentId, entityId } = await setupProjectWithEntityAndDoc(t, userId);

      await t.run(async (ctx) => {
        await ctx.db.insert('facts', {
          projectId,
          entityId,
          documentId,
          subject: 'Jon Snow',
          predicate: 'is',
          object: 'confirmed',
          confidence: 1.0,
          evidenceSnippet: 'text',
          status: 'confirmed',
          createdAt: Date.now(),
        });
        await ctx.db.insert('facts', {
          projectId,
          entityId,
          documentId,
          subject: 'Jon Snow',
          predicate: 'is',
          object: 'pending 1',
          confidence: 0.9,
          evidenceSnippet: 'text',
          status: 'pending',
          createdAt: Date.now(),
        });
        await ctx.db.insert('facts', {
          projectId,
          entityId,
          documentId,
          subject: 'Jon Snow',
          predicate: 'is',
          object: 'pending 2',
          confidence: 0.8,
          evidenceSnippet: 'text',
          status: 'pending',
          createdAt: Date.now(),
        });
      });

      const facts = await asUser.query(api.facts.listPending, { projectId });
      expect(facts).toHaveLength(2);
      expect(facts.every((f) => f.status === 'pending')).toBe(true);
    });

    it('returns empty array when not project owner', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        const otherUserId = await ctx.db.insert('users', {
          name: 'Other',
          email: 'other@test.com',
          createdAt: Date.now(),
        });
        return await ctx.db.insert('projects', {
          userId: otherUserId,
          name: 'Other',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const facts = await asUser.query(api.facts.listPending, { projectId });
      expect(facts).toEqual([]);
    });
  });

  describe('listByDocument query', () => {
    it('returns all facts extracted from document', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, documentId, entityId } = await setupProjectWithEntityAndDoc(t, userId);

      await t.run(async (ctx) => {
        await ctx.db.insert('facts', {
          projectId,
          entityId,
          documentId,
          subject: 'Fact 1',
          predicate: 'from',
          object: 'this doc',
          confidence: 1.0,
          evidenceSnippet: 'text',
          status: 'confirmed',
          createdAt: Date.now(),
        });
        await ctx.db.insert('facts', {
          projectId,
          entityId,
          documentId,
          subject: 'Fact 2',
          predicate: 'also from',
          object: 'this doc',
          confidence: 0.9,
          evidenceSnippet: 'text',
          status: 'pending',
          createdAt: Date.now(),
        });
      });

      const facts = await asUser.query(api.facts.listByDocument, { documentId });
      expect(facts).toHaveLength(2);
    });
  });

  describe('remove mutation', () => {
    it('does NOT decrement factCount when removing rejected fact', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const { projectId, rejectedFactId } = await t.run(async (ctx) => {
        const pId = await ctx.db.insert('projects', {
          userId,
          name: 'Test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          stats: { documentCount: 1, entityCount: 1, factCount: 1, alertCount: 0, noteCount: 0 },
        });
        const dId = await ctx.db.insert('documents', {
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
          name: 'Entity',
          type: 'character',
          aliases: [],
          status: 'confirmed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        await ctx.db.insert('facts', {
          projectId: pId,
          entityId: eId,
          documentId: dId,
          subject: 'Confirmed Fact',
          predicate: 'is',
          object: 'counted',
          confidence: 1.0,
          evidenceSnippet: 'text',
          status: 'confirmed',
          createdAt: Date.now(),
        });
        const rejId = await ctx.db.insert('facts', {
          projectId: pId,
          entityId: eId,
          documentId: dId,
          subject: 'Rejected Fact',
          predicate: 'was',
          object: 'rejected',
          confidence: 1.0,
          evidenceSnippet: 'text',
          status: 'rejected',
          createdAt: Date.now(),
        });
        return { projectId: pId, rejectedFactId: rejId };
      });

      await asUser.mutation(api.facts.remove, { id: rejectedFactId });

      const project = await t.run(async (ctx) => ctx.db.get(projectId));
      expect(project?.stats?.factCount).toBe(1);
    });

    it('deletes fact and decrements project stat', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const { projectId, factId } = await t.run(async (ctx) => {
        const pId = await ctx.db.insert('projects', {
          userId,
          name: 'Test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          stats: { documentCount: 1, entityCount: 1, factCount: 1, alertCount: 0, noteCount: 0 },
        });
        const dId = await ctx.db.insert('documents', {
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
          name: 'Entity',
          type: 'character',
          aliases: [],
          status: 'confirmed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        const fId = await ctx.db.insert('facts', {
          projectId: pId,
          entityId: eId,
          documentId: dId,
          subject: 'To Delete',
          predicate: 'will be',
          object: 'deleted',
          confidence: 1.0,
          evidenceSnippet: 'text',
          status: 'confirmed',
          createdAt: Date.now(),
        });
        return { projectId: pId, factId: fId };
      });

      await asUser.mutation(api.facts.remove, { id: factId });

      const fact = await t.run(async (ctx) => ctx.db.get(factId));
      expect(fact).toBeNull();

      const project = await t.run(async (ctx) => ctx.db.get(projectId));
      expect(project?.stats?.factCount).toBe(0);
    });
  });
});
