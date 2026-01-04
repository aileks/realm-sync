import {Result, ResultAsync, ok, err} from 'neverthrow';

type AppError = AuthError | NotFoundError | ValidationError | ConfigurationError | ApiError;

type AuthError = {
  type: 'AUTH_ERROR';
  code: 'UNAUTHENTICATED' | 'UNAUTHORIZED';
  message: string;
};

type NotFoundError = {
  type: 'NOT_FOUND';
  resource: 'project' | 'document' | 'entity' | 'fact' | 'user';
  id: string;
};

type ValidationError = {
  type: 'VALIDATION';
  field: string;
  reason: string;
};

type ConfigurationError = {
  type: 'CONFIG_ERROR';
  key: string;
  message: string;
};

type ApiError = {
  type: 'API_ERROR';
  statusCode: number;
  message: string;
  details?: unknown;
};

const authError = (code: AuthError['code'], message: string): AuthError => ({
  type: 'AUTH_ERROR',
  code,
  message,
});

const notFoundError = (resource: NotFoundError['resource'], id: string): NotFoundError => ({
  type: 'NOT_FOUND',
  resource,
  id,
});

const validationError = (field: string, reason: string): ValidationError => ({
  type: 'VALIDATION',
  field,
  reason,
});

const configError = (key: string, message: string): ConfigurationError => ({
  type: 'CONFIG_ERROR',
  key,
  message,
});

const apiError = (statusCode: number, message: string, details?: unknown): ApiError => ({
  type: 'API_ERROR',
  statusCode,
  message,
  details,
});

export {
  Result,
  ResultAsync,
  ok,
  err,
  authError,
  notFoundError,
  validationError,
  configError,
  apiError,
};
export type {AppError, AuthError, NotFoundError, ValidationError, ConfigurationError, ApiError};
export type {Ok, Err} from 'neverthrow';
