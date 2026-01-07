import { z } from 'zod';

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

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signUpSchema = signInSchema
  .extend({
    name: z.string().min(1, 'Name is required'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });
