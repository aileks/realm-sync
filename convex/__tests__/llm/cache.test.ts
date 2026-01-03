import { describe, expect, it } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from '../../_generated/api';
import schema from '../../schema';

const modules = import.meta.glob('../../**/*.ts');

describe('checkCache', () => {
  describe('cache miss', () => {
    it('returns null for new content', async () => {
      const t = convexTest(schema, modules);
      const hash = await t.query(api.llm.utils.computeHash, {
        content: 'Test content',
      });

      const cached = await t.query(api.llm.cache.checkCache, {
        inputHash: hash,
        promptVersion: 'v1',
      });

      expect(cached).toBe(null);
    });

    it('returns null for different prompt version', async () => {
      const t = convexTest(schema, modules);
      const hash = await t.query(api.llm.utils.computeHash, {
        content: 'Test content',
      });

      await t.run(async (ctx) => {
        await ctx.db.insert('llmCache', {
          inputHash: hash,
          promptVersion: 'v1',
          response: { test: 'data' },
          expiresAt: Date.now() + 604800000,
        });
      });

      const cached = await t.query(api.llm.cache.checkCache, {
        inputHash: hash,
        promptVersion: 'v2',
      });

      expect(cached).toBe(null);
    });
  });

  describe('cache hit', () => {
    it('returns stored response for existing hash', async () => {
      const t = convexTest(schema, modules);
      const hash = await t.query(api.llm.utils.computeHash, {
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
          response: testResponse,
          expiresAt: Date.now() + 604800000,
        });
      });

      const cached = await t.query(api.llm.cache.checkCache, {
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
    const hash = await t.query(api.llm.utils.computeHash, {
      content: 'Test content',
    });

    const testResponse = {
      entities: [{ name: 'Test Entity', type: 'character' }],
      facts: [],
      relationships: [],
    };

    const cacheId = await t.mutation(api.llm.cache.saveToCache, {
      inputHash: hash,
      promptVersion: 'v1',
      modelId: 'test-model',
      response: testResponse,
    });

    const saved = await t.run(async (ctx) => {
      const cache = await ctx.db.get(cacheId);
      expect(cache).not.toBeNull();
      expect(cache?.inputHash).toBe(hash);
      expect(cache?.promptVersion).toBe('v1');
      expect(cache?.modelId).toBe('test-model');
      expect(cache?.response).toBe(JSON.stringify(testResponse));
      expect(cache?.createdAt).toBeDefined();
      expect(cache?.expiresAt).toBeDefined();
      expect(cache?.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  it('stores modelId when provided', async () => {
    const t = convexTest(schema, modules);
    const hash = await t.query(api.llm.utils.computeHash, {
      content: 'Test content',
    });

    const testResponse = {
      entities: [{ name: 'Test Entity', type: 'character' }],
      facts: [],
      relationships: [],
    };

    const cacheId = await t.mutation(api.llm.cache.saveToCache, {
      inputHash: hash,
      promptVersion: 'v1',
      modelId: 'test-model',
      response: testResponse,
    });

    const saved = await t.run(async (ctx) => {
      const cache = await ctx.db.get(cacheId);
      expect(cache).not.toBeNull();
      expect(cache?.inputHash).toBe(hash);
      expect(cache?.promptVersion).toBe('v1');
      expect(cache?.modelId).toBe('test-model');
      expect(cache?.response).toBe(JSON.stringify(testResponse));
    });
  });
});

describe('invalidateCache', () => {
    it('removes expired entries', async () => {
      const t = convexTest(schema, modules);
      const hash = await t.query(api.llm.utils.computeHash, {
        content: 'Test content',
      });

      await t.run(async (ctx) => {
        const cacheId = await ctx.db.insert('llmCache', {
          inputHash: hash,
          promptVersion: 'v1',
          response: { test: 'data' },
          expiresAt: Date.now() - 1000,
        });
        await ctx.db.insert('llmCache', {
          inputHash: hash,
          promptVersion: 'v1',
          response: { test: 'expired' },
          expiresAt: Date.now() + 1000,
        });
      });

      await t.mutation(api.llm.cache.invalidateCache, { promptVersion: 'v1' });

      const remaining = await t.run(async (ctx) => {
        return await ctx.db
          .query('llmCache')
          .withIndex('by_prompt_version', (q) => q.eq('promptVersion', 'v1'))
          .collect();
      });

      expect(remaining).toHaveLength(1);
    });

  it('removes specific entry by hash', async () => {
      const t = convexTest(schema, modules);
      const hash = await t.query(api.llm.utils.computeHash, {
        content: 'Test content',
      });

      await t.run(async (ctx) => {
        const cacheId = await ctx.db.insert('llmCache', {
          inputHash: hash,
          promptVersion: 'v1',
          response: { test: 'delete_me' },
          expiresAt: Date.now() + 1000,
        });
      });

      await t.mutation(api.llm.cache.invalidateCache, {
        inputHash: hash,
      });

      const remaining = await t.run(async (ctx) => {
        return await ctx.db
          .query('llmCache')
          .withIndex('by_prompt_version', (q) => q.eq('promptVersion', 'v1'))
          .collect();
      });

      expect(remaining).toHaveLength(0);
    });

    await t.run(async (ctx) => {
      const cacheId = await ctx.db.insert('llmCache', {
        inputHash: hash,
        promptVersion: 'v1',
        response: { test: 'data' },
        expiresAt: Date.now() - 1000,
      });
      await ctx.db.insert('llmCache', {
        inputHash: hash,
        promptVersion: 'v1',
        response: { test: 'expired' },
        expiresAt: Date.now() + 1000,
      });
    });

    await t.mutation(api.llm.cache.invalidateCache, { promptVersion: 'v1' });

    const remaining = await t.run(async (ctx) => {
      return await ctx.db
        .query('llmCache')
        .withIndex('by_prompt_version', (q) => q.eq('promptVersion', 'v1'))
        .collect();
    });

    expect(remaining).toHaveLength(1);
  });

  it('removes specific entry by hash', async () => {
    const t = convexTest(schema, modules);
    const hash = await t.query(api.llm.utils.computeHash, {
      content: 'Test content',
    });

    await t.run(async (ctx) => {
      const cacheId = await ctx.db.insert('llmCache', {
        inputHash: hash,
        promptVersion: 'v1',
        response: { test: 'delete_me' },
        expiresAt: Date.now() + 1000,
      });
    });

    await t.mutation(api.llm.cache.invalidateCache, {
      inputHash: hash,
    });

    const remaining = await t.run(async (ctx) => {
      return await ctx.db.query('llmCache').collect();
    });

    expect(remaining).toHaveLength(0);
  });
});
