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
  defaultStats,
} from './helpers';
import { expectConvexErrorCode } from '../testUtils';

describe('entities mutations', () => {
  describe('create', () => {
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

    it('creates entity with pending status by default', async () => {
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
      await asUser.mutation(api.entities.create, {
        projectId,
        name: 'Test Entity',
        type: 'character',
      });

      const project = await t.run(async (ctx) => ctx.db.get(projectId));
      expect(project?.stats?.entityCount).toBe(1);
    });

    it('works on projects without pre-existing stats', async () => {
      const noStatsProjectId = await setupProject(t, userId, { withStats: false });

      await asUser.mutation(api.entities.create, {
        projectId: noStatsProjectId,
        name: 'Test Entity',
        type: 'character',
      });

      const project = await t.run(async (ctx) => ctx.db.get(noStatsProjectId));
      expect(project?.stats?.entityCount).toBe(1);
    });

    it('throws when not authenticated', async () => {
      await expectConvexErrorCode(
        t.mutation(api.entities.create, {
          projectId,
          name: 'Test',
          type: 'character',
        }),
        'unauthenticated'
      );
    });

    it('throws when not project owner', async () => {
      const otherUserId = await setupOtherUser(t);
      const otherProjectId = await setupProject(t, otherUserId);

      await expectConvexErrorCode(
        asUser.mutation(api.entities.create, {
          projectId: otherProjectId,
          name: 'Test',
          type: 'character',
        }),
        'unauthorized'
      );
    });
  });

  describe('update', () => {
    let t: TestContext;
    let userId: Id<'users'>;
    let asUser: ReturnType<TestContext['withIdentity']>;

    beforeEach(async () => {
      t = createTestContext();
      const auth = await setupAuthenticatedUser(t);
      userId = auth.userId;
      asUser = auth.asUser;
    });

    it('updates entity fields', async () => {
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
      const projectId = await setupProject(t, userId);
      const entityId = await setupEntity(t, projectId, { status: 'pending' });

      await asUser.mutation(api.entities.update, {
        id: entityId,
        status: 'confirmed',
      });

      const entity = await t.run(async (ctx) => ctx.db.get(entityId));
      expect(entity?.status).toBe('confirmed');
    });

    it('throws when entity not found', async () => {
      const { entityId } = await setupProjectWithEntities(t, userId);
      await t.run(async (ctx) => ctx.db.delete(entityId));

      await expect(
        asUser.mutation(api.entities.update, { id: entityId, name: 'Ghost' })
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('merge', () => {
    let t: TestContext;
    let userId: Id<'users'>;
    let asUser: ReturnType<TestContext['withIdentity']>;

    beforeEach(async () => {
      t = createTestContext();
      const auth = await setupAuthenticatedUser(t);
      userId = auth.userId;
      asUser = auth.asUser;
    });

    it('merges two entities, combining aliases', async () => {
      const projectId = await setupProject(t, userId, {
        stats: { ...defaultStats(), entityCount: 2, factCount: 1 },
      });
      const documentId = await setupDocument(t, projectId);

      const sourceId = await setupEntity(t, projectId, {
        name: 'Lord Snow',
        aliases: ['Bastard of Winterfell'],
        status: 'pending',
      });
      const targetId = await setupEntity(t, projectId, {
        name: 'Jon Snow',
        aliases: ['The White Wolf'],
        status: 'confirmed',
      });
      const factId = await setupFact(
        t,
        { projectId, entityId: sourceId, documentId },
        {
          subject: 'Lord Snow',
          predicate: 'is',
          object: 'a bastard',
          status: 'confirmed',
        }
      );

      await asUser.mutation(api.entities.merge, { sourceId, targetId });

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
      const project1Id = await setupProject(t, userId);
      const project2Id = await setupProject(t, userId);

      const sourceId = await setupEntity(t, project1Id);
      const targetId = await setupEntity(t, project2Id, { status: 'confirmed' });

      await expect(asUser.mutation(api.entities.merge, { sourceId, targetId })).rejects.toThrow(
        /different projects/i
      );
    });
  });

  describe('confirm', () => {
    let t: TestContext;
    let userId: Id<'users'>;
    let asUser: ReturnType<TestContext['withIdentity']>;

    beforeEach(async () => {
      t = createTestContext();
      const auth = await setupAuthenticatedUser(t);
      userId = auth.userId;
      asUser = auth.asUser;
    });

    it('confirms a pending entity', async () => {
      const projectId = await setupProject(t, userId);
      const entityId = await setupEntity(t, projectId, { status: 'pending' });

      await asUser.mutation(api.entities.confirm, { id: entityId });

      const entity = await t.run(async (ctx) => ctx.db.get(entityId));
      expect(entity?.status).toBe('confirmed');
    });

    it('throws when entity not found', async () => {
      const { entityId } = await setupProjectWithEntities(t, userId);
      await t.run(async (ctx) => ctx.db.delete(entityId));

      await expect(asUser.mutation(api.entities.confirm, { id: entityId })).rejects.toThrow(
        /not found/i
      );
    });
  });

  describe('reject', () => {
    let t: TestContext;
    let userId: Id<'users'>;
    let asUser: ReturnType<TestContext['withIdentity']>;

    beforeEach(async () => {
      t = createTestContext();
      const auth = await setupAuthenticatedUser(t);
      userId = auth.userId;
      asUser = auth.asUser;
    });

    it('rejects entity and cascades to delete facts', async () => {
      const projectId = await setupProject(t, userId, {
        stats: { ...defaultStats(), entityCount: 1, factCount: 1 },
      });
      const documentId = await setupDocument(t, projectId);
      const entityId = await setupEntity(t, projectId, { name: 'To Reject' });
      const factId = await setupFact(t, { projectId, entityId, documentId });

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

  describe('remove', () => {
    let t: TestContext;
    let userId: Id<'users'>;
    let asUser: ReturnType<TestContext['withIdentity']>;

    beforeEach(async () => {
      t = createTestContext();
      const auth = await setupAuthenticatedUser(t);
      userId = auth.userId;
      asUser = auth.asUser;
    });

    it('only decrements factCount for non-rejected facts when cascading', async () => {
      const projectId = await setupProject(t, userId, {
        stats: { ...defaultStats(), entityCount: 1, factCount: 3 },
      });
      const documentId = await setupDocument(t, projectId);
      const entityId = await setupEntity(t, projectId, { status: 'confirmed' });

      const ids = { projectId, entityId, documentId };
      await setupFact(t, ids, { subject: 'Confirmed', status: 'confirmed' });
      await setupFact(t, ids, { subject: 'Pending', status: 'pending' });
      await setupFact(t, ids, { subject: 'Rejected', status: 'rejected' });

      await asUser.mutation(api.entities.remove, { id: entityId });

      const project = await t.run(async (ctx) => ctx.db.get(projectId));
      expect(project?.stats?.entityCount).toBe(0);
      expect(project?.stats?.factCount).toBe(1);
    });

    it('deletes entity and cascades to facts', async () => {
      const projectId = await setupProject(t, userId, {
        stats: { ...defaultStats(), entityCount: 1, factCount: 1 },
      });
      const documentId = await setupDocument(t, projectId);
      const entityId = await setupEntity(t, projectId);
      const factId = await setupFact(t, { projectId, entityId, documentId });

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

  describe('revealToPlayers', () => {
    let t: TestContext;
    let userId: Id<'users'>;
    let asUser: ReturnType<TestContext['withIdentity']>;

    beforeEach(async () => {
      t = createTestContext();
      const auth = await setupAuthenticatedUser(t);
      userId = auth.userId;
      asUser = auth.asUser;
    });

    it('reveals entity to players in TTRPG project', async () => {
      const projectId = await setupProject(t, userId, { projectType: 'ttrpg' });
      const entityId = await setupEntity(t, projectId, { status: 'confirmed' });

      await asUser.mutation(api.entities.revealToPlayers, { entityId });

      const entity = await t.run(async (ctx) => ctx.db.get(entityId));
      expect(entity?.revealedToViewers).toBe(true);
      expect(entity?.revealedAt).toBeDefined();
    });

    it('throws when project is not TTRPG', async () => {
      const projectId = await setupProject(t, userId, { projectType: 'general' });
      const entityId = await setupEntity(t, projectId, { status: 'confirmed' });

      await expect(asUser.mutation(api.entities.revealToPlayers, { entityId })).rejects.toThrow(
        /ttrpg/i
      );
    });

    it('throws when reveal is disabled on project', async () => {
      const projectId = await setupProject(t, userId, {
        projectType: 'ttrpg',
        revealToPlayersEnabled: false,
      });
      const entityId = await setupEntity(t, projectId, { status: 'confirmed' });

      await expect(asUser.mutation(api.entities.revealToPlayers, { entityId })).rejects.toThrow(
        /reveal is disabled/i
      );
    });

    it('throws when not project owner', async () => {
      const otherUserId = await setupOtherUser(t);
      const projectId = await setupProject(t, otherUserId, { projectType: 'ttrpg' });
      const entityId = await setupEntity(t, projectId, { status: 'confirmed' });

      await expectConvexErrorCode(
        asUser.mutation(api.entities.revealToPlayers, { entityId }),
        'unauthorized'
      );
    });

    it('throws when not authenticated', async () => {
      const projectId = await setupProject(t, userId, { projectType: 'ttrpg' });
      const entityId = await setupEntity(t, projectId, { status: 'confirmed' });

      await expectConvexErrorCode(
        t.mutation(api.entities.revealToPlayers, { entityId }),
        'unauthenticated'
      );
    });
  });

  describe('hideFromPlayers', () => {
    let t: TestContext;
    let userId: Id<'users'>;
    let asUser: ReturnType<TestContext['withIdentity']>;

    beforeEach(async () => {
      t = createTestContext();
      const auth = await setupAuthenticatedUser(t);
      userId = auth.userId;
      asUser = auth.asUser;
    });

    it('hides entity from players in TTRPG project', async () => {
      const projectId = await setupProject(t, userId, { projectType: 'ttrpg' });
      const entityId = await setupEntity(t, projectId, {
        status: 'confirmed',
        revealedToViewers: true,
      });

      await asUser.mutation(api.entities.hideFromPlayers, { entityId });

      const entity = await t.run(async (ctx) => ctx.db.get(entityId));
      expect(entity?.revealedToViewers).toBe(false);
    });

    it('throws when project is not TTRPG', async () => {
      const projectId = await setupProject(t, userId, { projectType: 'general' });
      const entityId = await setupEntity(t, projectId, {
        status: 'confirmed',
        revealedToViewers: true,
      });

      await expect(asUser.mutation(api.entities.hideFromPlayers, { entityId })).rejects.toThrow(
        /ttrpg/i
      );
    });

    it('throws when reveal is disabled on project', async () => {
      const projectId = await setupProject(t, userId, {
        projectType: 'ttrpg',
        revealToPlayersEnabled: false,
      });
      const entityId = await setupEntity(t, projectId, {
        status: 'confirmed',
        revealedToViewers: true,
      });

      await expect(asUser.mutation(api.entities.hideFromPlayers, { entityId })).rejects.toThrow(
        /reveal is disabled/i
      );
    });

    it('throws when not project owner', async () => {
      const otherUserId = await setupOtherUser(t);
      const projectId = await setupProject(t, otherUserId, { projectType: 'ttrpg' });
      const entityId = await setupEntity(t, projectId, {
        status: 'confirmed',
        revealedToViewers: true,
      });

      await expectConvexErrorCode(
        asUser.mutation(api.entities.hideFromPlayers, { entityId }),
        'unauthorized'
      );
    });
  });
});
