import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn', () => {
  it('merges tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('handles clsx-compatible inputs', () => {
    expect(cn('text-red-500', { 'bg-blue-500': true })).toContain('text-red-500');
    expect(cn('text-red-500', { 'bg-blue-500': true })).toContain('bg-blue-500');
  });

  it('resolves conflicts (later classes win)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('handles undefined/null inputs', () => {
    expect(cn('px-2', undefined, null, 'py-1')).toBe('px-2 py-1');
  });

  it('handles nested arrays', () => {
    expect(cn(['px-2', ['py-1']], 'mx-3')).toBe('px-2 py-1 mx-3');
  });

  it('handles boolean conditions', () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe('base active');
  });

  it('returns empty string for no valid inputs', () => {
    expect(cn(undefined, null, false)).toBe('');
  });
});
