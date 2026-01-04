import {describe, it, expect} from 'vitest';
import {ok, err} from 'neverthrow';
import {unwrapOrThrow, safeJsonParse} from '../../lib/result';
import {authError, notFoundError, validationError, configError, apiError} from '../../lib/errors';

describe('unwrapOrThrow', () => {
  it('returns value for Ok result', () => {
    const result = ok('success');
    expect(unwrapOrThrow(result)).toBe('success');
  });

  it('throws for AUTH_ERROR', () => {
    const result = err(authError('UNAUTHENTICATED', 'Please log in'));
    expect(() => unwrapOrThrow(result)).toThrow('Please log in');
  });

  it('throws for NOT_FOUND error with capitalized resource', () => {
    const result = err(notFoundError('project', 'abc123'));
    expect(() => unwrapOrThrow(result)).toThrow('Project not found');
  });

  it('throws for VALIDATION error', () => {
    const result = err(validationError('email', 'Invalid format'));
    expect(() => unwrapOrThrow(result)).toThrow('Validation error: email - Invalid format');
  });

  it('throws for CONFIG_ERROR', () => {
    const result = err(configError('API_KEY', 'Missing'));
    expect(() => unwrapOrThrow(result)).toThrow('Configuration error: API_KEY');
  });

  it('throws for API_ERROR', () => {
    const result = err(apiError(500, 'Server error'));
    expect(() => unwrapOrThrow(result)).toThrow('API error 500: Server error');
  });
});

describe('safeJsonParse', () => {
  it('returns Ok for valid JSON', () => {
    const result = safeJsonParse('{"name": "test"}');
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({name: 'test'});
  });

  it('returns Err for invalid JSON', () => {
    const result = safeJsonParse('invalid json');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.type).toBe('VALIDATION');
      expect(result.error.field).toBe('json');
      expect(result.error.reason).toContain('Parse error');
    }
  });

  it('handles empty string', () => {
    const result = safeJsonParse('');
    expect(result.isErr()).toBe(true);
  });

  it('handles arrays', () => {
    const result = safeJsonParse('[1, 2, 3]');
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual([1, 2, 3]);
  });
});
