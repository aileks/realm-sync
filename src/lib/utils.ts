import {clsx, type ClassValue} from 'clsx';
import {twMerge} from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ERROR_MESSAGES: Record<string, string> = {
  'Unauthorized: Authentication required': 'Please sign in to continue.',
  Unauthorized: 'You do not have permission to perform this action.',
  'Project not found': 'This project could not be found.',
  'Document not found': 'This document could not be found.',
  'Entity not found': 'This entity could not be found.',
  'Fact not found': 'This fact could not be found.',
  'User not found': 'This user could not be found.',
};

export function formatError(error: unknown): string {
  if (!error) return 'An unexpected error occurred.';

  let message: string;

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else {
    return 'An unexpected error occurred.';
  }

  if (message.includes('Uncaught Error:')) {
    message = message.replace(/^Uncaught Error:\s*/, '');
  }

  if (message.includes('\n')) {
    message = message.split('\n')[0];
  }

  const cleaned = message.replace(/^Error:\s*/i, '').trim();

  if (ERROR_MESSAGES[cleaned]) {
    return ERROR_MESSAGES[cleaned];
  }

  if (cleaned.startsWith('Validation error:')) {
    const field = cleaned.match(/Validation error:\s*(\w+)/)?.[1];
    return field ? `Invalid ${field}. Please check your input.` : 'Please check your input.';
  }

  if (cleaned.startsWith('API error')) {
    return 'A server error occurred. Please try again later.';
  }

  if (cleaned.startsWith('Configuration error')) {
    return 'A configuration issue occurred. Please contact support.';
  }

  if (cleaned.length > 100) {
    return cleaned.slice(0, 100) + '...';
  }

  return cleaned || 'An unexpected error occurred.';
}
