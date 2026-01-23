import { ConvexError, type Value } from 'convex/values';

export type AppErrorCode =
  | 'unauthenticated'
  | 'unauthorized'
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'limit'
  | 'configuration'
  | 'api'
  | 'not_allowed'
  | 'rate_limited';

export type AppErrorData = {
  code: AppErrorCode;
  message: string;
  details?: Record<string, Value>;
};

type AuthCode = 'unauthenticated' | 'unauthorized';

const toConvexError = (data: AppErrorData): ConvexError<AppErrorData> => new ConvexError(data);

const authError = (code: AuthCode, message: string): ConvexError<AppErrorData> =>
  toConvexError({ code, message });

const notFoundError = (
  resource: string,
  id?: string,
  message = `${capitalize(resource)} not found`
): ConvexError<AppErrorData> =>
  toConvexError({
    code: 'not_found',
    message,
    details: { resource, ...(id ? { id } : {}) },
  });

const validationError = (field: string, message: string): ConvexError<AppErrorData> =>
  toConvexError({ code: 'validation', message, details: { field } });

const configError = (key: string, message: string): ConvexError<AppErrorData> =>
  toConvexError({ code: 'configuration', message, details: { key } });

const apiError = (
  statusCode: number,
  message: string,
  details?: Record<string, Value>
): ConvexError<AppErrorData> =>
  toConvexError({
    code: 'api',
    message,
    details: { statusCode, ...details },
  });

const limitError = (
  resource: string,
  limit: number,
  message: string
): ConvexError<AppErrorData> =>
  toConvexError({
    code: 'limit',
    message,
    details: { resource, limit },
  });

const conflictError = (message: string, field?: string): ConvexError<AppErrorData> =>
  toConvexError({
    code: 'conflict',
    message,
    details: field ? { field } : undefined,
  });

const notAllowedError = (message: string, reason?: string): ConvexError<AppErrorData> =>
  toConvexError({
    code: 'not_allowed',
    message,
    details: reason ? { reason } : undefined,
  });

const rateLimitError = (
  message: string,
  details?: Record<string, Value>
): ConvexError<AppErrorData> =>
  toConvexError({
    code: 'rate_limited',
    message,
    details,
  });

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export {
  authError,
  notFoundError,
  validationError,
  configError,
  apiError,
  limitError,
  conflictError,
  notAllowedError,
  rateLimitError,
  toConvexError,
};
