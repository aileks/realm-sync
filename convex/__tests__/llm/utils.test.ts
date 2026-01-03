import { describe, expect, it } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from '../../_generated/api';
import schema from '../../schema';

const modules = import.meta.glob('../../**/*.ts');

describe('computeHash', () => {
  it('produces consistent SHA-256 hash for same content', async () => {
    const t = convexTest(schema, modules);

    const hash1 = await t.query(api.llm.utils.computeHash, {
      content: 'The quick brown fox jumps over the lazy dog',
    });
    const hash2 = await t.query(api.llm.utils.computeHash, {
      content: 'The quick brown fox jumps over the lazy dog',
    });

    expect(hash1).toBe(hash2);
    expect(hash1).toBeTypeOf('string');
    expect(hash1).toHaveLength(64);
  });

  it('produces different hashes for different content', async () => {
    const t = convexTest(schema, modules);

    const hash1 = await t.query(api.llm.utils.computeHash, {
      content: 'The quick brown fox',
    });
    const hash2 = await t.query(api.llm.utils.computeHash, {
      content: 'The quick brown dog',
    });

    expect(hash1).not.toBe(hash2);
  });

  it('handles empty string', async () => {
    const t = convexTest(schema, modules);

    const hash = await t.query(api.llm.utils.computeHash, {
      content: '',
    });

    expect(hash).toBeTypeOf('string');
    expect(hash).toHaveLength(64);
  });

  it('handles unicode characters', async () => {
    const t = convexTest(schema, modules);

    const hash1 = await t.query(api.llm.utils.computeHash, {
      content: 'Hello 世界',
    });
    const hash2 = await t.query(api.llm.utils.computeHash, {
      content: 'Hello 世界',
    });

    expect(hash1).toBe(hash2);
  });
});
