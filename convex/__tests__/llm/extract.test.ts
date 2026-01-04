import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { internal } from '../../_generated/api';
import schema from '../../schema';

const modules = import.meta.glob('../../**/*.ts');

async function setupProjectWithDocument(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', {
      name: 'Test User',
      email: 'test@example.com',
      createdAt: Date.now(),
    });

    const projectId = await ctx.db.insert('projects', {
      userId,
      name: 'Test Project',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stats: { documentCount: 1, entityCount: 0, factCount: 0, alertCount: 0 },
    });

    const documentId = await ctx.db.insert('documents', {
      projectId,
      title: 'Test Document',
      content: 'Jon Snow is King in the North. He knows nothing.',
      contentType: 'text',
      orderIndex: 0,
      wordCount: 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      processingStatus: 'processing',
    });

    return { userId, projectId, documentId };
  });
}

describe('processExtractionResult', () => {
  it('creates entities with pending status from extraction result', async () => {
    const t = convexTest(schema, modules);
    const { projectId, documentId } = await setupProjectWithDocument(t);

    const extractionResult = {
      entities: [
        {
          name: 'Jon Snow',
          type: 'character' as const,
          description: 'King in the North',
          aliases: ['Lord Snow', 'The White Wolf'],
        },
        {
          name: 'The North',
          type: 'location' as const,
          description: 'A kingdom in Westeros',
        },
      ],
      facts: [],
      relationships: [],
    };

    await t.mutation(internal.llm.extract.processExtractionResult, {
      documentId,
      result: extractionResult,
    });

    const entities = await t.run(async (ctx) => {
      return await ctx.db
        .query('entities')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect();
    });

    expect(entities).toHaveLength(2);

    const jonSnow = entities.find((e) => e.name === 'Jon Snow');
    expect(jonSnow).toBeDefined();
    expect(jonSnow?.type).toBe('character');
    expect(jonSnow?.status).toBe('pending');
    expect(jonSnow?.aliases).toContain('Lord Snow');
    expect(jonSnow?.firstMentionedIn).toBe(documentId);

    const theNorth = entities.find((e) => e.name === 'The North');
    expect(theNorth).toBeDefined();
    expect(theNorth?.type).toBe('location');
  });

  it('creates facts with pending status from extraction result', async () => {
    const t = convexTest(schema, modules);
    const { projectId, documentId } = await setupProjectWithDocument(t);

    const extractionResult = {
      entities: [{ name: 'Jon Snow', type: 'character' as const }],
      facts: [
        {
          entityName: 'Jon Snow',
          subject: 'Jon Snow',
          predicate: 'is',
          object: 'King in the North',
          confidence: 1.0,
          evidence: '"Jon Snow is King in the North"',
        },
        {
          entityName: 'Jon Snow',
          subject: 'Jon Snow',
          predicate: 'knows',
          object: 'nothing',
          confidence: 0.9,
          evidence: '"He knows nothing"',
          temporalBound: { type: 'relative' as const, value: 'before becoming King' },
        },
      ],
      relationships: [],
    };

    await t.mutation(internal.llm.extract.processExtractionResult, {
      documentId,
      result: extractionResult,
    });

    const facts = await t.run(async (ctx) => {
      return await ctx.db
        .query('facts')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect();
    });

    expect(facts).toHaveLength(2);

    const kingFact = facts.find((f) => f.object === 'King in the North');
    expect(kingFact).toBeDefined();
    expect(kingFact?.status).toBe('pending');
    expect(kingFact?.confidence).toBe(1.0);

    const knowsFact = facts.find((f) => f.predicate === 'knows');
    expect(knowsFact).toBeDefined();
    expect(knowsFact?.temporalBound).toEqual({ type: 'relative', value: 'before becoming King' });
  });

  it('stores relationships as facts with relationshipType as predicate', async () => {
    const t = convexTest(schema, modules);
    const { projectId, documentId } = await setupProjectWithDocument(t);

    const extractionResult = {
      entities: [
        { name: 'Jon Snow', type: 'character' as const },
        { name: 'Daenerys', type: 'character' as const },
      ],
      facts: [],
      relationships: [
        {
          sourceEntity: 'Jon Snow',
          targetEntity: 'Daenerys',
          relationshipType: 'allied_with',
          evidence: '"Jon Snow bent the knee to Daenerys"',
        },
      ],
    };

    await t.mutation(internal.llm.extract.processExtractionResult, {
      documentId,
      result: extractionResult,
    });

    const facts = await t.run(async (ctx) => {
      return await ctx.db
        .query('facts')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect();
    });

    expect(facts).toHaveLength(1);
    expect(facts[0].subject).toBe('Jon Snow');
    expect(facts[0].predicate).toBe('allied_with');
    expect(facts[0].object).toBe('Daenerys');
    expect(facts[0].status).toBe('pending');
  });

  it('reuses existing entity when name matches', async () => {
    const t = convexTest(schema, modules);
    const { projectId, documentId } = await setupProjectWithDocument(t);

    await t.run(async (ctx) => {
      await ctx.db.insert('entities', {
        projectId,
        name: 'Jon Snow',
        type: 'character',
        description: 'Existing description',
        aliases: ['Existing Alias'],
        status: 'confirmed',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const extractionResult = {
      entities: [
        {
          name: 'Jon Snow',
          type: 'character' as const,
          description: 'New description from extraction',
          aliases: ['Lord Snow'],
        },
      ],
      facts: [
        {
          entityName: 'Jon Snow',
          subject: 'Jon Snow',
          predicate: 'is',
          object: 'brave',
          confidence: 0.8,
          evidence: 'text',
        },
      ],
      relationships: [],
    };

    await t.mutation(internal.llm.extract.processExtractionResult, {
      documentId,
      result: extractionResult,
    });

    const entities = await t.run(async (ctx) => {
      return await ctx.db
        .query('entities')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect();
    });

    expect(entities).toHaveLength(1);
    expect(entities[0].status).toBe('confirmed');
    expect(entities[0].description).toBe('Existing description');
  });

  it('updates document processingStatus to completed', async () => {
    const t = convexTest(schema, modules);
    const { documentId } = await setupProjectWithDocument(t);

    const extractionResult = {
      entities: [{ name: 'Test', type: 'character' as const }],
      facts: [],
      relationships: [],
    };

    await t.mutation(internal.llm.extract.processExtractionResult, {
      documentId,
      result: extractionResult,
    });

    const doc = await t.run(async (ctx) => ctx.db.get(documentId));
    expect(doc?.processingStatus).toBe('completed');
    expect(doc?.processedAt).toBeDefined();
  });

  it('updates project stats with new entity and fact counts', async () => {
    const t = convexTest(schema, modules);
    const { projectId, documentId } = await setupProjectWithDocument(t);

    const extractionResult = {
      entities: [
        { name: 'Entity 1', type: 'character' as const },
        { name: 'Entity 2', type: 'location' as const },
      ],
      facts: [
        {
          entityName: 'Entity 1',
          subject: 'Entity 1',
          predicate: 'is',
          object: 'something',
          confidence: 1.0,
          evidence: 'text',
        },
      ],
      relationships: [],
    };

    await t.mutation(internal.llm.extract.processExtractionResult, {
      documentId,
      result: extractionResult,
    });

    const project = await t.run(async (ctx) => ctx.db.get(projectId));
    expect(project?.stats?.entityCount).toBe(2);
    expect(project?.stats?.factCount).toBe(1);
  });

  it('handles empty extraction result gracefully', async () => {
    const t = convexTest(schema, modules);
    const { documentId } = await setupProjectWithDocument(t);

    const extractionResult = {
      entities: [],
      facts: [],
      relationships: [],
    };

    await t.mutation(internal.llm.extract.processExtractionResult, {
      documentId,
      result: extractionResult,
    });

    const doc = await t.run(async (ctx) => ctx.db.get(documentId));
    expect(doc?.processingStatus).toBe('completed');
  });

  it('skips facts for entities that do not exist', async () => {
    const t = convexTest(schema, modules);
    const { projectId, documentId } = await setupProjectWithDocument(t);

    const extractionResult = {
      entities: [{ name: 'Jon Snow', type: 'character' as const }],
      facts: [
        {
          entityName: 'Jon Snow',
          subject: 'Jon Snow',
          predicate: 'is',
          object: 'valid',
          confidence: 1.0,
          evidence: 'text',
        },
        {
          entityName: 'Unknown Entity',
          subject: 'Unknown',
          predicate: 'is',
          object: 'skipped',
          confidence: 1.0,
          evidence: 'text',
        },
      ],
      relationships: [],
    };

    await t.mutation(internal.llm.extract.processExtractionResult, {
      documentId,
      result: extractionResult,
    });

    const facts = await t.run(async (ctx) => {
      return await ctx.db
        .query('facts')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect();
    });

    expect(facts).toHaveLength(1);
    expect(facts[0].object).toBe('valid');
  });

  it('persists evidencePosition for facts when provided', async () => {
    const t = convexTest(schema, modules);
    const { projectId, documentId } = await setupProjectWithDocument(t);

    const extractionResult = {
      entities: [{ name: 'Jon Snow', type: 'character' as const }],
      facts: [
        {
          entityName: 'Jon Snow',
          subject: 'Jon Snow',
          predicate: 'is',
          object: 'King in the North',
          confidence: 1.0,
          evidence: 'Jon Snow is King in the North',
          evidencePosition: { start: 0, end: 30 },
        },
      ],
      relationships: [],
    };

    await t.mutation(internal.llm.extract.processExtractionResult, {
      documentId,
      result: extractionResult,
    });

    const facts = await t.run(async (ctx) => {
      return await ctx.db
        .query('facts')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect();
    });

    expect(facts).toHaveLength(1);
    expect(facts[0].evidencePosition).toEqual({ start: 0, end: 30 });
  });

  it('persists evidencePosition for relationships when provided', async () => {
    const t = convexTest(schema, modules);
    const { projectId, documentId } = await setupProjectWithDocument(t);

    const extractionResult = {
      entities: [
        { name: 'Jon Snow', type: 'character' as const },
        { name: 'Daenerys', type: 'character' as const },
      ],
      facts: [],
      relationships: [
        {
          sourceEntity: 'Jon Snow',
          targetEntity: 'Daenerys',
          relationshipType: 'allied_with',
          evidence: 'Jon Snow bent the knee',
          evidencePosition: { start: 100, end: 122 },
        },
      ],
    };

    await t.mutation(internal.llm.extract.processExtractionResult, {
      documentId,
      result: extractionResult,
    });

    const facts = await t.run(async (ctx) => {
      return await ctx.db
        .query('facts')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect();
    });

    expect(facts).toHaveLength(1);
    expect(facts[0].evidencePosition).toEqual({ start: 100, end: 122 });
  });

  it('handles facts without evidencePosition', async () => {
    const t = convexTest(schema, modules);
    const { projectId, documentId } = await setupProjectWithDocument(t);

    const extractionResult = {
      entities: [{ name: 'Jon Snow', type: 'character' as const }],
      facts: [
        {
          entityName: 'Jon Snow',
          subject: 'Jon Snow',
          predicate: 'is',
          object: 'brave',
          confidence: 0.8,
          evidence: 'some evidence',
        },
      ],
      relationships: [],
    };

    await t.mutation(internal.llm.extract.processExtractionResult, {
      documentId,
      result: extractionResult,
    });

    const facts = await t.run(async (ctx) => {
      return await ctx.db
        .query('facts')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect();
    });

    expect(facts).toHaveLength(1);
    expect(facts[0].evidencePosition).toBeUndefined();
  });

  it('handles entity with missing aliases array', async () => {
    const t = convexTest(schema, modules);
    const { projectId, documentId } = await setupProjectWithDocument(t);

    const extractionResult = {
      entities: [
        {
          name: 'No Aliases Entity',
          type: 'character' as const,
          aliases: undefined as unknown as string[],
        },
      ],
      facts: [],
      relationships: [],
    };

    await t.mutation(internal.llm.extract.processExtractionResult, {
      documentId,
      result: extractionResult,
    });

    const entities = await t.run(async (ctx) => {
      return await ctx.db
        .query('entities')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect();
    });

    expect(entities).toHaveLength(1);
    expect(entities[0].aliases).toEqual([]);
  });
});
