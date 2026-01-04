import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '../../_generated/api';
import type { Id } from '../../_generated/dataModel';
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
});
