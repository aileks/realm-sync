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
    const firstProject = result.projects[0];

    const project = await t.run(async (ctx) => {
      return await ctx.db.get(firstProject.projectId);
    });

    expect(project).not.toBeNull();
    expect(project?.userId).toBe(userId);
    expect(project?.name).toBe('The Northern Chronicles');
    expect(project?.stats).toEqual({
      documentCount: 2,
      entityCount: 12,
      factCount: 8,
      alertCount: 0,
      noteCount: 0,
    });
  });

  it('creates two documents with correct content', async () => {
    const t = convexTest(schema, getModules());
    const { userId } = await setupAuthenticatedUser(t);

    const result = await t.mutation(internal.seed.seedDemoData, { userId });
    const firstProject = result.projects[0];

    const docs = await t.run(async (ctx) => {
      return await ctx.db
        .query('documents')
        .withIndex('by_project', (q) => q.eq('projectId', firstProject.projectId))
        .collect();
    });

    expect(docs).toHaveLength(2);

    const doc1 = docs.find((d) => d.title.includes('Chapter 1'));
    const doc2 = docs.find((d) => d.title.includes('Chapter 2'));

    expect(doc1).toBeDefined();
    expect(doc1?.title).toBe('Chapter 1: The Frozen Throne');
    expect(doc1?.contentType).toBe('text');
    expect(doc1?.processingStatus).toBe('completed');
    expect(doc1?.orderIndex).toBe(0);

    expect(doc2).toBeDefined();
    expect(doc2?.title).toBe('Chapter 2: The Ancient Pact');
    expect(doc2?.orderIndex).toBe(1);
  });

  it('creates entities with correct types and firstMentionedIn', async () => {
    const t = convexTest(schema, getModules());
    const { userId } = await setupAuthenticatedUser(t);

    const result = await t.mutation(internal.seed.seedDemoData, { userId });
    const firstProject = result.projects[0];

    const entities = await t.run(async (ctx) => {
      return await ctx.db
        .query('entities')
        .withIndex('by_project', (q) => q.eq('projectId', firstProject.projectId))
        .collect();
    });

    expect(entities).toHaveLength(12);

    const aldric = entities.find((e) => e.name === 'King Aldric');
    expect(aldric).toBeDefined();
    expect(aldric?.type).toBe('character');
    expect(aldric?.status).toBe('confirmed');

    const sera = entities.find((e) => e.name === 'Princess Sera');
    expect(sera).toBeDefined();
    expect(sera?.status).toBe('pending');

    const thorne = entities.find((e) => e.name === 'Commander Thorne');
    expect(thorne).toBeDefined();
    expect(thorne?.status).toBe('pending');

    const crow = entities.find((e) => e.name === 'Magister Crow');
    expect(crow).toBeDefined();
    expect(crow?.status).toBe('pending');

    const winterhold = entities.find((e) => e.name === 'Winterhold Castle');
    expect(winterhold).toBeDefined();
    expect(winterhold?.type).toBe('location');
    expect(winterhold?.status).toBe('confirmed');

    const frostborne = entities.find((e) => e.name === 'The Frostborne');
    expect(frostborne).toBeDefined();
    expect(frostborne?.type).toBe('concept');

    const pact = entities.find((e) => e.name === 'The Pact of Frost');
    expect(pact).toBeDefined();
    expect(pact?.type).toBe('event');
    expect(pact?.status).toBe('confirmed');
  });

  it('creates facts with correct evidencePositions', async () => {
    const t = convexTest(schema, getModules());
    const { userId } = await setupAuthenticatedUser(t);

    const result = await t.mutation(internal.seed.seedDemoData, { userId });
    const firstProject = result.projects[0];

    const facts = await t.run(async (ctx) => {
      return await ctx.db
        .query('facts')
        .withIndex('by_project', (q) => q.eq('projectId', firstProject.projectId))
        .collect();
    });

    expect(facts).toHaveLength(8);

    const aldricAgeFact = facts.find(
      (f) => f.subject === 'King Aldric' && f.predicate === 'has_age'
    );
    expect(aldricAgeFact).toBeDefined();
    expect(aldricAgeFact?.evidencePosition).toEqual({ start: 456, end: 505 });
    expect(aldricAgeFact?.status).toBe('confirmed');

    const pactFact = facts.find((f) => f.subject.includes('Pact of Frost'));
    expect(pactFact).toBeDefined();
    expect(pactFact?.confidence).toBe(0.85);
  });

  it('returns all 3 projects with their documentIds', async () => {
    const t = convexTest(schema, getModules());
    const { userId } = await setupAuthenticatedUser(t);

    const result = await t.mutation(internal.seed.seedDemoData, { userId });

    expect(result.projects).toHaveLength(3);
    expect(result.projects[0].projectId).toBeDefined();
    expect(result.projects[0].documentIds).toHaveLength(2);
    expect(result.projects[1].projectId).toBeDefined();
    expect(result.projects[1].documentIds).toHaveLength(2);
    expect(result.projects[2].projectId).toBeDefined();
    expect(result.projects[2].documentIds).toHaveLength(2);
  });
});

describe('seed.clearSeedData internal mutation', () => {
  it('deletes all seed data for a project', async () => {
    const t = convexTest(schema, getModules());
    const { userId } = await setupAuthenticatedUser(t);

    const seedResult = await t.mutation(internal.seed.seedDemoData, { userId });
    const projectId = seedResult.projects[0].projectId;

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
