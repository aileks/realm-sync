import { validationError } from './errors';

export function parseJsonOrThrow<T = unknown>(input: string): T {
  try {
    return JSON.parse(input) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw validationError('json', `Parse error: ${message}`);
  }
}
