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
type Details = Record<string, Value>;

const cleanDetails = (details?: Details): Details | null => {
  if (!details) return null;
  const entries = Object.entries(details).filter(([, value]) => value !== undefined);
  if (!entries.length) return null;
  return Object.fromEntries(entries) as Details;
};

const buildErrorData = (code: AppErrorCode, message: string, details?: Details): AppErrorData => {
  const cleaned = cleanDetails(details);
  return cleaned ? { code, message, details: cleaned } : { code, message };
};

const toConvexError = (data: AppErrorData): ConvexError<AppErrorData> => new ConvexError(data);

const authError = (code: AuthCode, message: string): ConvexError<AppErrorData> =>
  toConvexError(buildErrorData(code, message));

const notFoundError = (
  resource: string,
  id?: string,
  message = `${capitalize(resource)} not found`
): ConvexError<AppErrorData> =>
  toConvexError(buildErrorData('not_found', message, { resource, ...(id ? { id } : {}) }));

const validationError = (field: string, message: string): ConvexError<AppErrorData> =>
  toConvexError(buildErrorData('validation', message, { field }));

const configError = (key: string, message: string): ConvexError<AppErrorData> =>
  toConvexError(buildErrorData('configuration', message, { key }));

const apiError = (
  statusCode: number,
  message: string,
  details?: Details
): ConvexError<AppErrorData> =>
  toConvexError(buildErrorData('api', message, { statusCode, ...details }));

const limitError = (resource: string, limit: number, message: string): ConvexError<AppErrorData> =>
  toConvexError(buildErrorData('limit', message, { resource, limit }));

const conflictError = (message: string, field?: string): ConvexError<AppErrorData> =>
  toConvexError(buildErrorData('conflict', message, field ? { field } : undefined));

const notAllowedError = (message: string, reason?: string): ConvexError<AppErrorData> =>
  toConvexError(buildErrorData('not_allowed', message, reason ? { reason } : undefined));

const rateLimitError = (message: string, details?: Details): ConvexError<AppErrorData> =>
  toConvexError(buildErrorData('rate_limited', message, details));

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
