import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { internal } from '../_generated/api';
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

  return { userId };
}

describe('seed.seedDemoData internal mutation', () => {
  it('creates project with correct stats', async () => {
    const t = convexTest(schema, getModules());
    const { userId } = await setupAuthenticatedUser(t);

    const result = await t.mutation(internal.seed.seedDemoData, { userId });
    const projectId = result.projectId;

    const project = await t.run(async (ctx) => {
      return await ctx.db.get(projectId);
    });

    expect(project).not.toBeNull();
    expect(project?.userId).toBe(userId);
    expect(project?.name).toBe('The Verdant Realm');
    expect(project?.projectType).toBe('general');
    expect(project?.isTutorial).toBe(true);
    expect(project?.stats).toEqual({
      documentCount: 3,
      entityCount: 14,
      factCount: 10,
      alertCount: 2,
      noteCount: 3,
    });
  });

  it('creates three documents with correct content', async () => {
    const t = convexTest(schema, getModules());
    const { userId } = await setupAuthenticatedUser(t);

    const result = await t.mutation(internal.seed.seedDemoData, { userId });
    const projectId = result.projectId;

    const docs = await t.run(async (ctx) => {
      return await ctx.db
        .query('documents')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect();
    });

    expect(docs).toHaveLength(3);

    const doc1 = docs.find((d) => d.title.includes('Chapter 1'));
    const doc2 = docs.find((d) => d.title.includes('Chapter 2'));
    const doc3 = docs.find((d) => d.title.includes('Chapter 3'));

    expect(doc1).toBeDefined();
    expect(doc1?.title).toBe('Chapter 1: The Beginning');
    expect(doc1?.contentType).toBe('markdown');
    expect(doc1?.processingStatus).toBe('completed');
    expect(doc1?.orderIndex).toBe(0);

    expect(doc2).toBeDefined();
    expect(doc2?.title).toBe('Chapter 2: The Conflict');
    expect(doc2?.orderIndex).toBe(1);

    expect(doc3).toBeDefined();
    expect(doc3?.title).toBe('Chapter 3: The Discovery');
    expect(doc3?.orderIndex).toBe(2);
  });

  it('creates entities with correct types and firstMentionedIn', async () => {
    const t = convexTest(schema, getModules());
    const { userId } = await setupAuthenticatedUser(t);

    const result = await t.mutation(internal.seed.seedDemoData, { userId });
    const projectId = result.projectId;

    const entities = await t.run(async (ctx) => {
      return await ctx.db
        .query('entities')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect();
    });

    expect(entities).toHaveLength(14);

    const aldric = entities.find((e) => e.name === 'Sir Aldric');
    expect(aldric).toBeDefined();
    expect(aldric?.type).toBe('character');
    expect(aldric?.status).toBe('confirmed');
    expect(aldric?.firstMentionedIn).toBeDefined();

    const mira = entities.find((e) => e.name === 'Lady Mira');
    expect(mira).toBeDefined();
    expect(mira?.status).toBe('confirmed');

    const crow = entities.find((e) => e.name === 'Magister Crow');
    expect(crow).toBeDefined();
    expect(crow?.status).toBe('pending');

    const thornhaven = entities.find((e) => e.name === 'Thornhaven');
    expect(thornhaven).toBeDefined();
    expect(thornhaven?.type).toBe('location');
    expect(thornhaven?.status).toBe('confirmed');

    const shadowbane = entities.find((e) => e.name === 'The Shadowbane');
    expect(shadowbane).toBeDefined();
    expect(shadowbane?.type).toBe('concept');

    const festival = entities.find((e) => e.name === 'Festival of Green Leaves');
    expect(festival).toBeDefined();
    expect(festival?.type).toBe('event');
    expect(festival?.status).toBe('pending');
  });

  it('creates facts with correct evidencePositions', async () => {
    const t = convexTest(schema, getModules());
    const { userId } = await setupAuthenticatedUser(t);

    const result = await t.mutation(internal.seed.seedDemoData, { userId });
    const projectId = result.projectId;

    const facts = await t.run(async (ctx) => {
      return await ctx.db
        .query('facts')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect();
    });

    expect(facts).toHaveLength(10);

    const aldricAgeFacts = facts.filter(
      (f) => f.subject === 'Sir Aldric' && f.predicate === 'has_age'
    );
    expect(aldricAgeFacts).toHaveLength(2);
    expect(aldricAgeFacts.map((fact) => fact.evidencePosition)).toEqual(
      expect.arrayContaining([
        { start: 95, end: 155 },
        { start: 52, end: 108 },
      ])
    );
    expect(aldricAgeFacts.map((fact) => fact.status)).toEqual(
      expect.arrayContaining(['confirmed'])
    );

    const shadowbaneFact = facts.find(
      (f) => f.subject === 'The Shadowbane' && f.predicate === 'true_nature'
    );
    expect(shadowbaneFact).toBeDefined();
    expect(shadowbaneFact?.confidence).toBe(0.85);
    expect(shadowbaneFact?.status).toBe('pending');
  });

  it('returns the seed project with documentIds', async () => {
    const t = convexTest(schema, getModules());
    const { userId } = await setupAuthenticatedUser(t);

    const result = await t.mutation(internal.seed.seedDemoData, { userId });

    expect(result.projectId).toBeDefined();
    expect(result.documentIds).toHaveLength(3);
  });
});

describe('seed.clearSeedData internal mutation', () => {
  it('deletes all seed data for a project', async () => {
    const t = convexTest(schema, getModules());
    const { userId } = await setupAuthenticatedUser(t);

    const seedResult = await t.mutation(internal.seed.seedDemoData, { userId });
    const projectId = seedResult.projectId;

    await t.mutation(internal.seed.clearSeedData, { projectId });

    const project = await t.run(async (ctx) => {
      return await ctx.db.get(projectId);
    });
    const docs = await t.run(async (ctx) => {
      return await ctx.db
        .query('documents')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect();
    });
    const entities = await t.run(async (ctx) => {
      return await ctx.db
        .query('entities')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect();
    });
    const facts = await t.run(async (ctx) => {
      return await ctx.db
        .query('facts')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect();
    });

    expect(project).toBeNull();
    expect(docs).toHaveLength(0);
    expect(entities).toHaveLength(0);
    expect(facts).toHaveLength(0);
  });

  it('handles non-existent project gracefully', async () => {
    const t = convexTest(schema, getModules());
    const { userId } = await setupAuthenticatedUser(t);

    const fakeProjectId = await t.run(async (ctx) => {
      return await ctx.db.insert('projects', {
        userId,
        name: 'Fake',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await t.mutation(internal.seed.clearSeedData, { projectId: fakeProjectId });

    const project = await t.run(async (ctx) => {
      return await ctx.db.get(fakeProjectId);
    });

    expect(project).toBeNull();
  });
});
