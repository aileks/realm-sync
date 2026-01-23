import { ConvexError } from 'convex/values';

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
  details?: Record<string, unknown>;
};

const DEFAULT_MESSAGE = 'An unexpected error occurred.';
const MAX_MESSAGE_LENGTH = 120;

const isAppErrorData = (data: unknown): data is AppErrorData => {
  if (!data || typeof data !== 'object') return false;
  const record = data as Record<string, unknown>;
  return typeof record.code === 'string' && typeof record.message === 'string';
};

const mapAppErrorMessage = (data: AppErrorData): string => {
  switch (data.code) {
    case 'unauthenticated':
      return data.message || 'Please sign in to continue.';
    case 'unauthorized':
      return data.message || 'You do not have permission to perform this action.';
    case 'configuration':
      return 'A configuration issue occurred. Please contact support.';
    case 'api':
      return 'A server error occurred. Please try again later.';
    case 'validation':
      return data.message || 'Please check your input.';
    case 'not_found':
    case 'conflict':
    case 'limit':
    case 'not_allowed':
    case 'rate_limited':
      return data.message || DEFAULT_MESSAGE;
    default:
      return data.message || DEFAULT_MESSAGE;
  }
};

const normalizeMessage = (message: string): string => {
  if (!message) return DEFAULT_MESSAGE;

  let cleaned = message;
  if (cleaned.includes('Uncaught Error:')) {
    cleaned = cleaned.replace(/^Uncaught Error:\s*/, '');
  }

  if (cleaned.includes('\n')) {
    cleaned = cleaned.split('\n')[0] ?? '';
  }

  cleaned = cleaned.replace(/^Error:\s*/i, '').trim();
  if (!cleaned) return DEFAULT_MESSAGE;

  if (cleaned.length > MAX_MESSAGE_LENGTH) {
    return cleaned.slice(0, MAX_MESSAGE_LENGTH) + '...';
  }

  return cleaned;
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof ConvexError) {
    const data = error.data;
    if (isAppErrorData(data)) {
      return normalizeMessage(mapAppErrorMessage(data));
    }
    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as { message?: unknown }).message;
      if (typeof message === 'string') {
        return normalizeMessage(message);
      }
    }
    if (typeof data === 'string') {
      return normalizeMessage(data);
    }
  }

  if (error instanceof Error) {
    return normalizeMessage(error.message);
  }

  if (typeof error === 'string') {
    return normalizeMessage(error);
  }

  return DEFAULT_MESSAGE;
};
