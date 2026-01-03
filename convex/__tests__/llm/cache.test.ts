import { describe, expect, it } from 'vitest';
import { convexTest } from 'convex-test';
import { internal } from '../../_generated/api';
import schema from '../../schema';

const modules = import.meta.glob('../../**/*.ts');

describe('checkCache', () => {
  describe('cache miss', () => {
    it('returns null for new content', async () => {
      const t = convexTest(schema, modules);
      const hash = await t.query(internal.llm.utils.computeHash, {
        content: 'Test content',
      });

      const cached = await t.query(internal.llm.cache.checkCache, {
        inputHash: hash,
        promptVersion: 'v1',
      });

      expect(cached).toBe(null);
    });

    it('returns null for different prompt version', async () => {
      const t = convexTest(schema, modules);
      const hash = await t.query(internal.llm.utils.computeHash, {
        content: 'Test content',
      });

      await t.run(async (ctx) => {
        await ctx.db.insert('llmCache', {
          inputHash: hash,
          promptVersion: 'v1',
          response: JSON.stringify({ test: 'data' }),
          modelId: 'test-model',
          createdAt: Date.now(),
          expiresAt: Date.now() + 604800000,
        });
      });

      const cached = await t.query(internal.llm.cache.checkCache, {
        inputHash: hash,
        promptVersion: 'v2',
      });

      expect(cached).toBe(null);
    });
  });

  describe('cache hit', () => {
    it('returns stored response for existing hash', async () => {
      const t = convexTest(schema, modules);
      const hash = await t.query(internal.llm.utils.computeHash, {
        content: 'Test content',
      });

      const testResponse = {
        entities: [{ name: 'Test Entity', type: 'character' }],
        facts: [],
        relationships: [],
      };

      await t.run(async (ctx) => {
        await ctx.db.insert('llmCache', {
          inputHash: hash,
          promptVersion: 'v1',
          response: JSON.stringify(testResponse),
          modelId: 'test-model',
          createdAt: Date.now(),
          expiresAt: Date.now() + 604800000,
        });
      });

      const cached = await t.query(internal.llm.cache.checkCache, {
        inputHash: hash,
        promptVersion: 'v1',
      });

      expect(cached).toEqual(testResponse);
    });
  });
});

describe('saveToCache', () => {
  it('stores response with correct hash and expiresAt', async () => {
    const t = convexTest(schema, modules);
    const hash = await t.query(internal.llm.utils.computeHash, {
      content: 'Test content',
    });

    const testResponse = {
      entities: [{ name: 'Test Entity', type: 'character' }],
      facts: [],
      relationships: [],
    };

    const cacheId = await t.mutation(internal.llm.cache.saveToCache, {
      inputHash: hash,
      promptVersion: 'v1',
      modelId: 'test-model',
      response: testResponse,
    });

    await t.run(async (ctx) => {
      const cache = await ctx.db.get(cacheId);
      expect(cache).not.toBeNull();
      if (cache) {
        expect(cache.inputHash).toBe(hash);
        expect(cache.promptVersion).toBe('v1');
        expect(cache.modelId).toBe('test-model');
        expect(cache.response).toBe(JSON.stringify(testResponse));
        expect(cache.createdAt).toBeDefined();
        expect(cache.expiresAt).toBeDefined();
        expect(cache.expiresAt).toBeGreaterThan(Date.now());
      }
    });
  });
});

describe('invalidateCache', () => {
  it('removes all entries for prompt version', async () => {
    const t = convexTest(schema, modules);
    const hash = await t.query(internal.llm.utils.computeHash, {
      content: 'Test content',
    });

    await t.run(async (ctx) => {
      await ctx.db.insert('llmCache', {
        inputHash: hash,
        promptVersion: 'v1',
        response: JSON.stringify({ test: 'data' }),
        modelId: 'test-model',
        createdAt: Date.now(),
        expiresAt: Date.now() - 1000,
      });
      await ctx.db.insert('llmCache', {
        inputHash: hash,
        promptVersion: 'v1',
        response: JSON.stringify({ test: 'expired' }),
        modelId: 'test-model',
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000,
      });
    });

    await t.mutation(internal.llm.cache.invalidateCache, { promptVersion: 'v1' });

    const remaining = await t.run(async (ctx) => {
      return await ctx.db
        .query('llmCache')
        .filter((q) => q.eq(q.field('promptVersion'), 'v1'))
        .collect();
    });

    expect(remaining).toHaveLength(0);
  });

  it('removes specific entry by hash', async () => {
    const t = convexTest(schema, modules);
    const hash = await t.query(internal.llm.utils.computeHash, {
      content: 'Test content',
    });

    await t.run(async (ctx) => {
      await ctx.db.insert('llmCache', {
        inputHash: hash,
        promptVersion: 'v1',
        response: JSON.stringify({ test: 'delete_me' }),
        modelId: 'test-model',
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000,
      });
    });

    await t.mutation(internal.llm.cache.invalidateCache, {
      inputHash: hash,
      promptVersion: 'v1',
    });

    const remaining = await t.run(async (ctx) => {
      return await ctx.db.query('llmCache').collect();
    });

    expect(remaining).toHaveLength(0);
  });
});
