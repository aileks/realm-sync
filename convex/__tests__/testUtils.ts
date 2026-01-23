import { expect } from 'vitest';
import { ConvexError } from 'convex/values';
import type { AppErrorCode, AppErrorData } from '../lib/errors';

const isAppErrorData = (value: unknown): value is AppErrorData => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.code === 'string' && typeof record.message === 'string';
};

const parseErrorData = (value: unknown): AppErrorData | null => {
  if (isAppErrorData(value)) return value;
  if (typeof value !== 'string') return null;
  const parsed = parseErrorJson(value);
  return parsed && isAppErrorData(parsed) ? parsed : null;
};

const parseErrorJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    const start = value.indexOf('{');
    const end = value.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(value.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
};

const extractErrorData = (error: unknown): AppErrorData | null => {
  if (error instanceof ConvexError) {
    return parseErrorData(error.data);
  }
  if (error && typeof error === 'object' && 'data' in error) {
    return parseErrorData((error as { data?: unknown }).data);
  }
  if (error instanceof Error) {
    return parseErrorData(error.message);
  }
  return parseErrorData(error) ?? parseErrorData(String(error));
};

type ErrorPromise = Promise<unknown> | (() => unknown);

const resolvePromise = (input: ErrorPromise): Promise<unknown> => {
  const result = typeof input === 'function' ? input() : input;
  return Promise.resolve(result);
};

export async function expectConvexErrorCode(
  promise: ErrorPromise,
  expectedCode: AppErrorCode
): Promise<AppErrorData> {
  try {
    await resolvePromise(promise);
  } catch (error) {
    const data = extractErrorData(error);
    if (!data) {
      throw error;
    }
    expect(data.code).toBe(expectedCode);
    return data;
  }
  throw new Error(`Expected ConvexError with code "${expectedCode}"`);
}
