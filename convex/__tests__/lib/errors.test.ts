import { describe, it, expect } from 'vitest';
import { authError, notFoundError, validationError, configError, apiError } from '../../lib/errors';

describe('error constructors', () => {
  describe('authError', () => {
    it('creates unauthenticated error', () => {
      const error = authError('UNAUTHENTICATED', 'Please log in');
      expect(error.type).toBe('AUTH_ERROR');
      expect(error.code).toBe('UNAUTHENTICATED');
      expect(error.message).toBe('Please log in');
    });

    it('creates unauthorized error', () => {
      const error = authError('UNAUTHORIZED', 'Not allowed');
      expect(error.type).toBe('AUTH_ERROR');
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Not allowed');
    });
  });

  describe('notFoundError', () => {
    it('creates error with resource type and id', () => {
      const error = notFoundError('project', 'abc123');
      expect(error.type).toBe('NOT_FOUND');
      expect(error.resource).toBe('project');
      expect(error.id).toBe('abc123');
    });

    it('supports all resource types', () => {
      const resources = ['project', 'document', 'entity', 'fact', 'user'] as const;
      for (const resource of resources) {
        const error = notFoundError(resource, 'id');
        expect(error.resource).toBe(resource);
      }
    });
  });

  describe('validationError', () => {
    it('creates error with field and reason', () => {
      const error = validationError('email', 'Invalid format');
      expect(error.type).toBe('VALIDATION');
      expect(error.field).toBe('email');
      expect(error.reason).toBe('Invalid format');
    });
  });

  describe('configError', () => {
    it('creates error with key and message', () => {
      const error = configError('API_KEY', 'Missing API key');
      expect(error.type).toBe('CONFIG_ERROR');
      expect(error.key).toBe('API_KEY');
      expect(error.message).toBe('Missing API key');
    });
  });

  describe('apiError', () => {
    it('creates error with status code and message', () => {
      const error = apiError(500, 'Internal server error');
      expect(error.type).toBe('API_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Internal server error');
      expect(error.details).toBeUndefined();
    });

    it('includes optional details', () => {
      const error = apiError(400, 'Bad request', { field: 'name' });
      expect(error.details).toEqual({ field: 'name' });
    });
  });
});
