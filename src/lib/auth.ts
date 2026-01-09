import { z } from 'zod';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '../../convex/lib/constants';

export type AuthErrorType =
  | 'account_not_found'
  | 'invalid_credentials'
  | 'rate_limited'
  | 'account_exists'
  | 'unknown';

export function classifyAuthError(error: unknown): AuthErrorType {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('InvalidAccountId') || message.includes('Could not find')) {
    return 'account_not_found';
  }
  if (message.includes('InvalidSecret')) {
    return 'invalid_credentials';
  }
  if (message.includes('TooManyFailedAttempts')) {
    return 'rate_limited';
  }
  if (
    message.includes('already exists') ||
    (message.includes('Account') && message.includes('exists'))
  ) {
    return 'account_exists';
  }
  return 'unknown';
}

export function getAuthErrorMessage(errorType: AuthErrorType, mode: 'signin' | 'signup'): string {
  switch (errorType) {
    case 'account_not_found':
      return mode === 'signin' ?
          'No account found with this email. Check your email or sign up.'
        : 'Failed to create account. Please try again.';
    case 'invalid_credentials':
      return 'Incorrect password. Please try again.';
    case 'rate_limited':
      return 'Too many failed attempts. Please try again later.';
    case 'account_exists':
      return mode === 'signup' ?
          'An account with this email already exists. Try signing in instead.'
        : 'Authentication failed. Please try again.';
    case 'unknown':
      return 'Authentication failed. Please try again.';
  }
}

export const passwordComplexitySchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(MAX_PASSWORD_LENGTH, `Password must be ${MAX_PASSWORD_LENGTH} characters or less`)
  .refine((password) => /[A-Z]/.test(password), {
    message: 'Password must contain at least one uppercase letter',
  })
  .refine((password) => /[a-z]/.test(password), {
    message: 'Password must contain at least one lowercase letter',
  })
  .refine((password) => /\d/.test(password), {
    message: 'Password must contain at least one number',
  })
  .refine((password) => /[!@#$%^&*()_+\-=[\]{}|\\:;"'<>,.?/]/.test(password), {
    message: 'Password must contain at least one special character',
  });

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const signUpSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: passwordComplexitySchema,
    name: z.string().min(1, 'Name is required'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });
