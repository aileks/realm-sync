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

describe('tutorial.seedTutorialProject', () => {
  it('creates The Verdant Realm tutorial project with correct structure', async () => {
    const t = convexTest(schema, getModules());
    const { userId, asUser } = await setupAuthenticatedUser(t);

    const result = await asUser.mutation(api.tutorial.seedTutorialProject, {});

    expect(result.alreadyExists).toBe(false);
    expect(result.projectId).toBeDefined();

    const project = await t.run(async (ctx) => {
      return await ctx.db.get(result.projectId);
    });

    expect(project).not.toBeNull();
    expect(project?.name).toBe('The Verdant Realm');
    expect(project?.isTutorial).toBe(true);
    expect(project?.projectType).toBe('ttrpg');
    expect(project?.userId).toBe(userId);
    expect(project?.stats).toEqual({
      documentCount: 3,
      entityCount: 12,
      factCount: 10,
      alertCount: 2,
      noteCount: 3,
    });
  });

  it('creates 3 documents covering the story', async () => {
    const t = convexTest(schema, getModules());
    const { asUser } = await setupAuthenticatedUser(t);

    const result = await asUser.mutation(api.tutorial.seedTutorialProject, {});

    const docs = await t.run(async (ctx) => {
      return await ctx.db
        .query('documents')
        .withIndex('by_project', (q) => q.eq('projectId', result.projectId))
        .collect();
    });

    expect(docs).toHaveLength(3);
    expect(docs.map((d) => d.title)).toContain('Chapter 1: The Beginning');
    expect(docs.map((d) => d.title)).toContain('Chapter 2: The Conflict');
    expect(docs.map((d) => d.title)).toContain('Chapter 3: The Discovery');
  });

  it('creates 12 entities covering all types', async () => {
    const t = convexTest(schema, getModules());
    const { asUser } = await setupAuthenticatedUser(t);

    const result = await asUser.mutation(api.tutorial.seedTutorialProject, {});

    const entities = await t.run(async (ctx) => {
      return await ctx.db
        .query('entities')
        .withIndex('by_project', (q) => q.eq('projectId', result.projectId))
        .collect();
    });

    expect(entities).toHaveLength(12);

    const types = entities.map((e) => e.type);
    expect(types).toContain('character');
    expect(types).toContain('location');
    expect(types).toContain('item');
    expect(types).toContain('concept');
    expect(types).toContain('event');

    const aldric = entities.find((e) => e.name === 'Sir Aldric');
    expect(aldric).toBeDefined();
    expect(aldric?.type).toBe('character');

    const crown = entities.find((e) => e.name === 'The Emerald Crown');
    expect(crown).toBeDefined();
    expect(crown?.type).toBe('item');

    const revealedEntities = entities.filter((e) => e.revealedToViewers === true);
    const hiddenEntities = entities.filter((e) => e.revealedToViewers === false);

    expect(revealedEntities).toHaveLength(3);
    expect(hiddenEntities).toHaveLength(1);
  });

  it('creates 10 facts with proper relationships', async () => {
    const t = convexTest(schema, getModules());
    const { asUser } = await setupAuthenticatedUser(t);

    const result = await asUser.mutation(api.tutorial.seedTutorialProject, {});

    const facts = await t.run(async (ctx) => {
      return await ctx.db
        .query('facts')
        .withIndex('by_project', (q) => q.eq('projectId', result.projectId))
        .collect();
    });

    expect(facts).toHaveLength(10);

    const aldricAgeFacts = facts.filter(
      (f) => f.subject === 'Sir Aldric' && f.predicate === 'has_age'
    );
    expect(aldricAgeFacts).toHaveLength(2);
  });

  it('creates 2 alerts demonstrating continuity checking', async () => {
    const t = convexTest(schema, getModules());
    const { asUser } = await setupAuthenticatedUser(t);

    const result = await asUser.mutation(api.tutorial.seedTutorialProject, {});

    const alerts = await t.run(async (ctx) => {
      return await ctx.db
        .query('alerts')
        .withIndex('by_project', (q) => q.eq('projectId', result.projectId).eq('status', 'open'))
        .collect();
    });

    expect(alerts).toHaveLength(2);

    const ageAlert = alerts.find((a) => a.title.includes('age'));
    expect(ageAlert).toBeDefined();
    expect(ageAlert?.type).toBe('contradiction');
    expect(ageAlert?.severity).toBe('error');

    const crownAlert = alerts.find((a) => a.title.includes('Crown'));
    expect(crownAlert).toBeDefined();
    expect(crownAlert?.type).toBe('contradiction');
    expect(crownAlert?.severity).toBe('warning');
  });

  it('creates 3 project notes with tags and pinned status', async () => {
    const t = convexTest(schema, getModules());
    const { asUser } = await setupAuthenticatedUser(t);

    const result = await asUser.mutation(api.tutorial.seedTutorialProject, {});

    const notes = await t.run(async (ctx) => {
      return await ctx.db
        .query('notes')
        .withIndex('by_project', (q) => q.eq('projectId', result.projectId))
        .collect();
    });

    expect(notes).toHaveLength(3);

    const pinnedNotes = notes.filter((n) =>  n.pinned);
    expect(pinnedNotes).toHaveLength(2);

    const campaignOverview = notes.find((n) => n.title === 'Campaign Overview');
    expect(campaignOverview).toBeDefined();
    expect(campaignOverview?.tags).toContain('ttrpg');
  });

  it('creates 3 entity notes for DM annotations', async () => {
    const t = convexTest(schema, getModules());
    const { asUser } = await setupAuthenticatedUser(t);

    const result = await asUser.mutation(api.tutorial.seedTutorialProject, {});

    const aldricEntity = await t.run(async (ctx) => {
      const entities = await ctx.db
        .query('entities')
        .withIndex('by_name', (q) => q.eq('projectId', result.projectId).eq('name', 'Sir Aldric'))
        .collect();
      return entities[0];
    });

    const entityNotes = await t.run(async (ctx) => {
      return await ctx.db
        .query('entityNotes')
        .withIndex('by_entity', (q) => q.eq('entityId', aldricEntity._id))
        .collect();
    });

    expect(entityNotes).toHaveLength(1);
    expect(entityNotes[0].content).toContain('age inconsistency');
  });

  it('returns existing project if tutorial already exists', async () => {
    const t = convexTest(schema, getModules());
    const { asUser } = await setupAuthenticatedUser(t);

    const first = await asUser.mutation(api.tutorial.seedTutorialProject, {});
    expect(first.alreadyExists).toBe(false);

    const second = await asUser.mutation(api.tutorial.seedTutorialProject, {});
    expect(second.alreadyExists).toBe(true);
    expect(second.projectId).toBe(first.projectId);
  });

  it('throws error for unauthenticated user', async () => {
    const t = convexTest(schema, getModules());

    await expect(t.mutation(api.tutorial.seedTutorialProject, {})).rejects.toThrow(
      'Unauthorized: Authentication required'
    );
  });
});

describe('tutorial.hasTutorialProject', () => {
  it('returns false when user has no tutorial project', async () => {
    const t = convexTest(schema, getModules());
    const { asUser } = await setupAuthenticatedUser(t);

    const result = await asUser.mutation(api.tutorial.hasTutorialProject, {});

    expect(result.hasTutorial).toBe(false);
    expect(result.projectId).toBeNull();
  });

  it('returns true with projectId when user has tutorial project', async () => {
    const t = convexTest(schema, getModules());
    const { asUser } = await setupAuthenticatedUser(t);

    const seed = await asUser.mutation(api.tutorial.seedTutorialProject, {});
    const result = await asUser.mutation(api.tutorial.hasTutorialProject, {});

    expect(result.hasTutorial).toBe(true);
    expect(result.projectId).toBe(seed.projectId);
  });
});
