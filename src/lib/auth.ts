import { z } from 'zod';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '../../convex/lib/constants';

export type AuthErrorType = 'account_not_found' | 'invalid_credentials' | 'unknown';

export function classifyAuthError(error: unknown): AuthErrorType {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('InvalidAccountId') || message.includes('Could not find')) {
    return 'account_not_found';
  }
  if (message.includes('InvalidSecret') || message.includes('password')) {
    return 'invalid_credentials';
  }
  return 'unknown';
}

export function getAuthErrorMessage(errorType: AuthErrorType, mode: 'signin' | 'signup'): string {
  switch (errorType) {
    case 'account_not_found':
      return mode === 'signin' ? 'Email or password incorrect.' : 'Failed to create account.';
    case 'invalid_credentials':
      return 'Email or password incorrect.';
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
