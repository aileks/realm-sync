import {Result} from 'neverthrow';
import type {AppError, ValidationError} from './errors';

function unwrapOrThrow<T>(result: Result<T, AppError>): T {
  if (result.isErr()) {
    const error = result.error;
    switch (error.type) {
      case 'AUTH_ERROR':
        throw new Error(error.message);
      case 'NOT_FOUND':
        throw new Error(`${capitalize(error.resource)} not found`);
      case 'VALIDATION':
        throw new Error(`Validation error: ${error.field} - ${error.reason}`);
      case 'CONFIG_ERROR':
        throw new Error(`Configuration error: ${error.key}`);
      case 'API_ERROR':
        throw new Error(`API error ${error.statusCode}: ${error.message}`);
    }
  }
  return result.value;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const safeJsonParse = Result.fromThrowable(
  (input: string): unknown => JSON.parse(input),
  (e): ValidationError => ({
    type: 'VALIDATION',
    field: 'json',
    reason: `Parse error: ${e instanceof Error ? e.message : String(e)}`,
  })
);

export {unwrapOrThrow, safeJsonParse};
