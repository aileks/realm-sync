import { describe, it, expect } from 'vitest';
import { ConvexError } from 'convex/values';
import { parseJsonOrThrow } from '../../lib/json';

describe('parseJsonOrThrow', () => {
  it('parses valid JSON', () => {
    const result = parseJsonOrThrow('{"name": "test"}');
    expect(result).toEqual({ name: 'test' });
  });

  it('throws ConvexError for invalid JSON', () => {
    expect(() => parseJsonOrThrow('invalid json')).toThrow(ConvexError);
    try {
      parseJsonOrThrow('invalid json');
    } catch (error) {
      expect(error).toBeInstanceOf(ConvexError);
      if (error instanceof ConvexError) {
        expect(error.data).toMatchObject({ code: 'validation' });
      }
    }
  });

  it('throws for empty string', () => {
    expect(() => parseJsonOrThrow('')).toThrow(ConvexError);
  });

  it('parses arrays', () => {
    const result = parseJsonOrThrow('[1, 2, 3]');
    expect(result).toEqual([1, 2, 3]);
  });
});
