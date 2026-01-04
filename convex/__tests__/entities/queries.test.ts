import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '../../_generated/api';
import type { Doc, Id } from '../../_generated/dataModel';
import {
  type TestContext,
  createTestContext,
  setupAuthenticatedUser,
  setupProject,
  setupDocument,
  setupEntity,
  setupFact,
  setupProjectWithEntities,
  setupOtherUser,
} from './helpers';

type EntityWithStats = Doc<'entities'> & { factCount: number };

describe('entities queries', () => {
  describe('listByProject', () => {
    let t: TestContext;
    let userId: Id<'users'>;
    let asUser: ReturnType<TestContext['withIdentity']>;
    let projectId: Id<'projects'>;

    beforeEach(async () => {
      t = createTestContext();
      const auth = await setupAuthenticatedUser(t);
      userId = auth.userId;
      asUser = auth.asUser;
      projectId = await setupProject(t, userId);
    });

    it('returns all entities for project', async () => {
      await setupEntity(t, projectId, { name: 'Character 1', status: 'confirmed' });
      await setupEntity(t, projectId, { name: 'Location 1', type: 'location', status: 'pending' });

      const entities = await asUser.query(api.entities.listByProject, { projectId });
      expect(entities).toHaveLength(2);
    });

    it('filters by type when provided', async () => {
      await setupEntity(t, projectId, { name: 'Character 1', status: 'confirmed' });
      await setupEntity(t, projectId, { name: 'Location 1', type: 'location', status: 'pending' });

      const entities = await asUser.query(api.entities.listByProject, {
        projectId,
        type: 'character',
      });
      expect(entities).toHaveLength(1);
      expect(entities[0].type).toBe('character');
    });

    it('filters by status when provided', async () => {
      await setupEntity(t, projectId, { name: 'Confirmed Entity', status: 'confirmed' });
      await setupEntity(t, projectId, { name: 'Pending Entity', status: 'pending' });

      const entities = await asUser.query(api.entities.listByProject, {
        projectId,
        status: 'pending',
      });
      expect(entities).toHaveLength(1);
      expect(entities[0].name).toBe('Pending Entity');
    });

    it('returns empty array when not project owner', async () => {
      const otherUserId = await setupOtherUser(t);
      const otherProjectId = await setupProject(t, otherUserId);

      const entities = await asUser.query(api.entities.listByProject, {
        projectId: otherProjectId,
      });
      expect(entities).toEqual([]);
    });
  });

  describe('listByProjectWithStats', () => {
    let t: TestContext;
    let userId: Id<'users'>;
    let asUser: ReturnType<TestContext['withIdentity']>;
    let projectId: Id<'projects'>;
    let documentId: Id<'documents'>;

    beforeEach(async () => {
      t = createTestContext();
      const auth = await setupAuthenticatedUser(t);
      userId = auth.userId;
      asUser = auth.asUser;
      projectId = await setupProject(t, userId);
      documentId = await setupDocument(t, projectId);
    });

    it('returns entities with fact counts', async () => {
      const entity1 = await setupEntity(t, projectId, { name: 'Entity A', status: 'confirmed' });
      const entity2 = await setupEntity(t, projectId, { name: 'Entity B', status: 'confirmed' });

      await setupFact(t, { projectId, entityId: entity1, documentId }, { status: 'confirmed' });
      await setupFact(t, { projectId, entityId: entity1, documentId }, { status: 'confirmed' });
      await setupFact(t, { projectId, entityId: entity2, documentId }, { status: 'confirmed' });

      const entities = await asUser.query(api.entities.listByProjectWithStats, { projectId });

      expect(entities).toHaveLength(2);
      const entityA = entities.find((e: EntityWithStats) => e.name === 'Entity A');
      const entityB = entities.find((e: EntityWithStats) => e.name === 'Entity B');
      expect(entityA?.factCount).toBe(2);
      expect(entityB?.factCount).toBe(1);
    });

    it('excludes rejected facts from count', async () => {
      const entityId = await setupEntity(t, projectId, {
        name: 'Test Entity',
        status: 'confirmed',
      });
      const ids = { projectId, entityId, documentId };

      await setupFact(t, ids, { status: 'confirmed' });
      await setupFact(t, ids, { status: 'rejected' });
      await setupFact(t, ids, { status: 'pending' });

      const entities = await asUser.query(api.entities.listByProjectWithStats, { projectId });

      expect(entities[0].factCount).toBe(2);
    });

    it('sorts by name ascending by default', async () => {
      await setupEntity(t, projectId, { name: 'Zebra', status: 'confirmed' });
      await setupEntity(t, projectId, { name: 'Apple', status: 'confirmed' });
      await setupEntity(t, projectId, { name: 'Mango', status: 'confirmed' });

      const entities = await asUser.query(api.entities.listByProjectWithStats, { projectId });

      expect(entities.map((e: EntityWithStats) => e.name)).toEqual(['Apple', 'Mango', 'Zebra']);
    });

    it('sorts by recent when specified', async () => {
      await setupEntity(t, projectId, { name: 'Old', status: 'confirmed' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await setupEntity(t, projectId, { name: 'New', status: 'confirmed' });

      const entities = await asUser.query(api.entities.listByProjectWithStats, {
        projectId,
        sortBy: 'recent',
      });

      expect(entities[0].name).toBe('New');
      expect(entities[1].name).toBe('Old');
    });

    it('sorts by fact count when specified', async () => {
      const entity1 = await setupEntity(t, projectId, { name: 'Few Facts', status: 'confirmed' });
      const entity2 = await setupEntity(t, projectId, { name: 'Many Facts', status: 'confirmed' });

      await setupFact(t, { projectId, entityId: entity1, documentId }, { status: 'confirmed' });
      await setupFact(t, { projectId, entityId: entity2, documentId }, { status: 'confirmed' });
      await setupFact(t, { projectId, entityId: entity2, documentId }, { status: 'confirmed' });
      await setupFact(t, { projectId, entityId: entity2, documentId }, { status: 'confirmed' });

      const entities = await asUser.query(api.entities.listByProjectWithStats, {
        projectId,
        sortBy: 'factCount',
      });

      expect(entities[0].name).toBe('Many Facts');
      expect(entities[0].factCount).toBe(3);
      expect(entities[1].name).toBe('Few Facts');
      expect(entities[1].factCount).toBe(1);
    });

    it('filters by type and status', async () => {
      await setupEntity(t, projectId, {
        name: 'Char Pending',
        type: 'character',
        status: 'pending',
      });
      await setupEntity(t, projectId, {
        name: 'Char Confirmed',
        type: 'character',
        status: 'confirmed',
      });
      await setupEntity(t, projectId, { name: 'Loc Pending', type: 'location', status: 'pending' });

      const entities = await asUser.query(api.entities.listByProjectWithStats, {
        projectId,
        type: 'character',
        status: 'pending',
      });

      expect(entities).toHaveLength(1);
      expect(entities[0].name).toBe('Char Pending');
    });
  });

  describe('getWithFacts', () => {
    let t: TestContext;
    let userId: Id<'users'>;
    let asUser: ReturnType<TestContext['withIdentity']>;

    beforeEach(async () => {
      t = createTestContext();
      const auth = await setupAuthenticatedUser(t);
      userId = auth.userId;
      asUser = auth.asUser;
    });

    it('returns entity with associated facts', async () => {
      const projectId = await setupProject(t, userId);
      const documentId = await setupDocument(t, projectId);
      const entityId = await setupEntity(t, projectId, {
        name: 'Jon Snow',
        status: 'confirmed',
      });

      const ids = { projectId, entityId, documentId };
      await setupFact(t, ids, {
        subject: 'Jon Snow',
        predicate: 'is',
        object: 'King in the North',
        status: 'confirmed',
      });
      await setupFact(t, ids, {
        subject: 'Jon Snow',
        predicate: 'knows',
        object: 'nothing',
        confidence: 0.9,
        status: 'pending',
      });

      const result = await asUser.query(api.entities.getWithFacts, { id: entityId });
      expect(result).not.toBeNull();
      expect(result?.entity.name).toBe('Jon Snow');
      expect(result?.facts).toHaveLength(2);
    });

    it('returns null when entity not found', async () => {
      const { entityId } = await setupProjectWithEntities(t, userId);
      await t.run(async (ctx) => ctx.db.delete(entityId));

      const result = await asUser.query(api.entities.getWithFacts, { id: entityId });
      expect(result).toBeNull();
    });

    it('returns null when not project owner', async () => {
      const otherUserId = await setupOtherUser(t);
      const otherProjectId = await setupProject(t, otherUserId);
      const entityId = await setupEntity(t, otherProjectId, { status: 'confirmed' });

      const result = await asUser.query(api.entities.getWithFacts, { id: entityId });
      expect(result).toBeNull();
    });
  });

  describe('listPending', () => {
    let t: TestContext;
    let userId: Id<'users'>;
    let asUser: ReturnType<TestContext['withIdentity']>;
    let projectId: Id<'projects'>;

    beforeEach(async () => {
      t = createTestContext();
      const auth = await setupAuthenticatedUser(t);
      userId = auth.userId;
      asUser = auth.asUser;
      projectId = await setupProject(t, userId);
    });

    it('returns only pending entities for project', async () => {
      await setupEntity(t, projectId, { name: 'Pending 1', status: 'pending' });
      await setupEntity(t, projectId, { name: 'Pending 2', type: 'location', status: 'pending' });
      await setupEntity(t, projectId, { name: 'Confirmed', type: 'item', status: 'confirmed' });

      const pending = await asUser.query(api.entities.listPending, { projectId });
      expect(pending).toHaveLength(2);
      expect(pending.every((e) => e.status === 'pending')).toBe(true);
    });
  });

  describe('findSimilar', () => {
    let t: TestContext;
    let userId: Id<'users'>;
    let asUser: ReturnType<TestContext['withIdentity']>;
    let projectId: Id<'projects'>;

    beforeEach(async () => {
      t = createTestContext();
      const auth = await setupAuthenticatedUser(t);
      userId = auth.userId;
      asUser = auth.asUser;
      projectId = await setupProject(t, userId);
    });

    it('finds entities with overlapping names', async () => {
      const entityId = await setupEntity(t, projectId, { name: 'Jon', status: 'pending' });
      await setupEntity(t, projectId, {
        name: 'Jon Snow',
        aliases: ['Lord Snow'],
        status: 'confirmed',
      });
      await setupEntity(t, projectId, { name: 'Daenerys', status: 'confirmed' });

      const similar = await asUser.query(api.entities.findSimilar, {
        projectId,
        name: 'Jon',
        excludeId: entityId,
      });

      expect(similar).toHaveLength(1);
      expect(similar[0].name).toBe('Jon Snow');
    });

    it('finds entities by alias match', async () => {
      await setupEntity(t, projectId, {
        name: 'Jon Snow',
        aliases: ['Lord Snow', 'The White Wolf'],
        status: 'confirmed',
      });

      const similar = await asUser.query(api.entities.findSimilar, {
        projectId,
        name: 'Lord Snow',
      });

      expect(similar).toHaveLength(1);
      expect(similar[0].name).toBe('Jon Snow');
    });
  });

  describe('search', () => {
    let t: TestContext;
    let userId: Id<'users'>;
    let asUser: ReturnType<TestContext['withIdentity']>;
    let projectId: Id<'projects'>;

    beforeEach(async () => {
      t = createTestContext();
      const auth = await setupAuthenticatedUser(t);
      userId = auth.userId;
      asUser = auth.asUser;
      projectId = await setupProject(t, userId);
    });

    it('returns empty array for empty query string', async () => {
      await setupEntity(t, projectId, {
        name: 'Jon Snow',
        description: 'King in the North',
        status: 'confirmed',
      });

      const results = await asUser.query(api.entities.search, {
        projectId,
        query: '',
      });

      expect(results).toEqual([]);
    });

    it('returns empty array for whitespace-only query', async () => {
      await setupEntity(t, projectId, {
        name: 'Jon Snow',
        description: 'King in the North',
        status: 'confirmed',
      });

      const results = await asUser.query(api.entities.search, {
        projectId,
        query: '   ',
      });

      expect(results).toEqual([]);
    });

    it('returns empty array when not project owner', async () => {
      const otherUserId = await setupOtherUser(t);
      const otherProjectId = await setupProject(t, otherUserId);
      await t.run(async (ctx) => {
        await ctx.db.insert('entities', {
          projectId: otherProjectId,
          name: 'Secret Entity',
          description: 'A hidden character',
          type: 'character',
          aliases: [],
          status: 'confirmed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const results = await asUser.query(api.entities.search, {
        projectId: otherProjectId,
        query: 'Secret',
      });

      expect(results).toEqual([]);
    });

    it('respects limit parameter', async () => {
      await setupEntity(t, projectId, {
        name: 'Entity One',
        description: 'First entity',
        status: 'confirmed',
      });
      await setupEntity(t, projectId, {
        name: 'Entity Two',
        description: 'Second entity',
        status: 'confirmed',
      });
      await setupEntity(t, projectId, {
        name: 'Entity Three',
        description: 'Third entity',
        status: 'confirmed',
      });

      const results = await asUser.query(api.entities.search, {
        projectId,
        query: 'Entity',
        limit: 2,
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('uses default limit of 20', async () => {
      const results = await asUser.query(api.entities.search, {
        projectId,
        query: 'test',
      });

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('getWithDetails', () => {
    let t: TestContext;
    let userId: Id<'users'>;
    let asUser: ReturnType<TestContext['withIdentity']>;

    beforeEach(async () => {
      t = createTestContext();
      const auth = await setupAuthenticatedUser(t);
      userId = auth.userId;
      asUser = auth.asUser;
    });

    it('returns entity with facts and appearances', async () => {
      const projectId = await setupProject(t, userId);
      const doc1 = await setupDocument(t, projectId, { title: 'Chapter 1' });
      const doc2 = await setupDocument(t, projectId, { title: 'Chapter 2' });
      const entityId = await setupEntity(t, projectId, {
        name: 'Jon Snow',
        description: 'King in the North',
        aliases: ['Lord Snow'],
        status: 'confirmed',
      });

      await setupFact(
        t,
        { projectId, entityId, documentId: doc1 },
        { subject: 'Jon Snow', predicate: 'eye_color', object: 'grey', status: 'confirmed' }
      );
      await setupFact(
        t,
        { projectId, entityId, documentId: doc2 },
        {
          subject: 'Jon Snow',
          predicate: 'title',
          object: 'King in the North',
          status: 'confirmed',
        }
      );

      const result = await asUser.query(api.entities.getWithDetails, { id: entityId });

      expect(result).not.toBeNull();
      expect(result?.entity.name).toBe('Jon Snow');
      expect(result?.facts).toHaveLength(2);
      expect(result?.appearances).toHaveLength(2);
      expect(result?.appearances.map((a) => a.title)).toContain('Chapter 1');
      expect(result?.appearances.map((a) => a.title)).toContain('Chapter 2');
    });

    it('excludes rejected facts', async () => {
      const projectId = await setupProject(t, userId);
      const documentId = await setupDocument(t, projectId);
      const entityId = await setupEntity(t, projectId, { name: 'Test', status: 'confirmed' });

      const ids = { projectId, entityId, documentId };
      await setupFact(t, ids, { predicate: 'is', object: 'good', status: 'confirmed' });
      await setupFact(t, ids, { predicate: 'was', object: 'bad', status: 'rejected' });
      await setupFact(t, ids, { predicate: 'will_be', object: 'great', status: 'pending' });

      const result = await asUser.query(api.entities.getWithDetails, { id: entityId });

      expect(result?.facts).toHaveLength(2);
      expect(result?.facts.map((f) => f.status)).not.toContain('rejected');
    });

    it('returns unique appearances from multiple facts in same document', async () => {
      const projectId = await setupProject(t, userId);
      const documentId = await setupDocument(t, projectId, { title: 'Single Doc' });
      const entityId = await setupEntity(t, projectId, { name: 'Test', status: 'confirmed' });

      const ids = { projectId, entityId, documentId };
      await setupFact(t, ids, { predicate: 'is', object: 'a', status: 'confirmed' });
      await setupFact(t, ids, { predicate: 'has', object: 'b', status: 'confirmed' });
      await setupFact(t, ids, { predicate: 'does', object: 'c', status: 'confirmed' });

      const result = await asUser.query(api.entities.getWithDetails, { id: entityId });

      expect(result?.facts).toHaveLength(3);
      expect(result?.appearances).toHaveLength(1);
      expect(result?.appearances[0].title).toBe('Single Doc');
    });

    it('returns null when entity not found', async () => {
      const { entityId } = await setupProjectWithEntities(t, userId);
      await t.run(async (ctx) => ctx.db.delete(entityId));

      const result = await asUser.query(api.entities.getWithDetails, { id: entityId });
      expect(result).toBeNull();
    });

    it('returns null when not project owner', async () => {
      const otherUserId = await setupOtherUser(t);
      const otherProjectId = await setupProject(t, otherUserId);
      const entityId = await setupEntity(t, otherProjectId, { status: 'confirmed' });

      const result = await asUser.query(api.entities.getWithDetails, { id: entityId });
      expect(result).toBeNull();
    });

    it('returns related entities based on fact object matching', async () => {
      const projectId = await setupProject(t, userId);
      const documentId = await setupDocument(t, projectId);

      const jonId = await setupEntity(t, projectId, { name: 'Jon Snow', status: 'confirmed' });
      const daenerysId = await setupEntity(t, projectId, { name: 'Daenerys', status: 'confirmed' });
      await setupEntity(t, projectId, { name: 'Arya Stark', status: 'confirmed' });

      await setupFact(
        t,
        { projectId, entityId: jonId, documentId },
        { subject: 'Jon Snow', predicate: 'met', object: 'Daenerys', status: 'confirmed' }
      );

      const result = await asUser.query(api.entities.getWithDetails, { id: jonId });

      expect(result?.relatedEntities).toBeDefined();
      expect(result?.relatedEntities).toHaveLength(1);
      expect(result?.relatedEntities[0]._id).toBe(daenerysId);
    });
  });
});
