import { describe, it, expect } from 'vitest';
import { ConvexError } from 'convex/values';
import {
  apiError,
  authError,
  conflictError,
  configError,
  limitError,
  notFoundError,
  validationError,
} from '../../lib/errors';

describe('error constructors', () => {
  describe('authError', () => {
    it('creates unauthenticated error', () => {
      const error = authError('unauthenticated', 'Please log in');
      expect(error).toBeInstanceOf(ConvexError);
      expect(error.data).toMatchObject({ code: 'unauthenticated', message: 'Please log in' });
    });

    it('creates unauthorized error', () => {
      const error = authError('unauthorized', 'Not allowed');
      expect(error).toBeInstanceOf(ConvexError);
      expect(error.data).toMatchObject({ code: 'unauthorized', message: 'Not allowed' });
    });
  });

  describe('notFoundError', () => {
    it('creates error with resource type and id', () => {
      const error = notFoundError('project', 'abc123');
      expect(error).toBeInstanceOf(ConvexError);
      expect(error.data).toMatchObject({
        code: 'not_found',
        message: 'Project not found',
        details: { resource: 'project', id: 'abc123' },
      });
    });

    it('supports all resource types', () => {
      const resources = ['project', 'document', 'entity', 'fact', 'user'] as const;
      for (const resource of resources) {
        const error = notFoundError(resource, 'id');
        expect((error.data.details as { resource: string }).resource).toBe(resource);
      }
    });
  });

  describe('validationError', () => {
    it('creates error with field and reason', () => {
      const error = validationError('email', 'Invalid format');
      expect(error).toBeInstanceOf(ConvexError);
      expect(error.data).toMatchObject({
        code: 'validation',
        message: 'Invalid format',
        details: { field: 'email' },
      });
    });
  });

  describe('configError', () => {
    it('creates error with key and message', () => {
      const error = configError('API_KEY', 'Missing API key');
      expect(error).toBeInstanceOf(ConvexError);
      expect(error.data).toMatchObject({
        code: 'configuration',
        message: 'Missing API key',
        details: { key: 'API_KEY' },
      });
    });
  });

  describe('apiError', () => {
    it('creates error with status code and message', () => {
      const error = apiError(500, 'Internal server error');
      expect(error).toBeInstanceOf(ConvexError);
      expect(error.data).toMatchObject({
        code: 'api',
        message: 'Internal server error',
        details: { statusCode: 500 },
      });
    });

    it('includes optional details', () => {
      const error = apiError(400, 'Bad request', { field: 'name' });
      expect(error.data).toMatchObject({
        code: 'api',
        message: 'Bad request',
        details: { statusCode: 400, field: 'name' },
      });
    });
  });

  describe('limitError', () => {
    it('includes limit details', () => {
      const error = limitError('projects', 3, 'Project limit reached');
      expect(error.data).toMatchObject({
        code: 'limit',
        message: 'Project limit reached',
        details: { resource: 'projects', limit: 3 },
      });
    });
  });

  describe('conflictError', () => {
    it('includes optional field detail', () => {
      const error = conflictError('Email already in use', 'email');
      expect(error.data).toMatchObject({
        code: 'conflict',
        message: 'Email already in use',
        details: { field: 'email' },
      });
    });
  });
});
