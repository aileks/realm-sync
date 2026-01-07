---
read_when: writing React component tests
---

# src/**tests**/

**Scope:** Frontend React testing patterns, mocking, and setup conventions

## STRUCTURE

```
src/__tests__/
├── setup.ts           # Global test setup (jest-dom matchers + cleanup)
├── keyboard-shortcuts.test.tsx
├── onboarding-modal.test.tsx
└── utils.test.ts
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Global setup | `setup.ts` | jest-dom matchers + afterEach cleanup |
| New component test | Create `*.test.tsx` alongside component | Use React Testing Library patterns |
| Mocking patterns | See existing tests for vi.mock examples | Convex, router, sonner mocked |

## TEST PATTERN

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { OnboardingModal } from './OnboardingModal';

// Mock external dependencies
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
}));

vi.mock('convex/react', () => ({
  useQuery: () => undefined,
  useMutation: (mutationRef: string) => {
    if (mutationRef === 'users.completeOnboarding') return mockCompleteOnboarding;
    return vi.fn();
  },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

describe('OnboardingModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.mockReturnValue({ onboardingCompleted: false });
    mockCompleteOnboarding.mockResolvedValue(undefined);
  });

  it('shows error toast when completeOnboarding fails', async () => {
    mockCompleteOnboarding.mockRejectedValueOnce(new Error('Network error'));
    render(<OnboardingModal />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Network error');
    });
  });
});
```

## CONVENTIONS

- **Test framework**: Vitest with React Testing Library
- **Environment**: jsdom (configured in vitest.config.ts)
- **Rendering**: `render()` from @testing-library/react
- **Selectors**: `screen.getByText()`, `screen.getByPlaceholderText()`, `screen.queryByText()`
- **Async**: `waitFor()` for React updates after mutations
- **Mocking**: `vi.mock()` for external deps (Convex, router, sonner)
- **Isolation**: `vi.clearAllMocks()` in each `beforeEach`
- **Assertions**: jest-dom matchers via `setup.ts`

## MOCKING PATTERNS

```typescript
// TanStack Router
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: 'test-id' }),
}));

// Convex hooks
vi.mock('convex/react', () => ({
  useQuery: () => mockReturnValue,
  useMutation: (ref) => {
    if (ref === 'api.function') return mockMutation;
    return vi.fn();
  },
}));

// Sonner toaster
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// External libraries
vi.mock('some-library', () => ({ default: vi.fn() }));
```

## SETUP FILE (setup.ts)

```typescript
import { afterEach, expect } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});
```

## COMMON ASSERTIONS

```typescript
// Element existence
expect(screen.getByText('Submit')).toBeDefined();
expect(screen.queryByText('Error')).toBeNull();

// Form interactions
expect(screen.getByPlaceholderText('Email')).toBeDefined();
expect(screen.getByRole('button', { name: 'Submit' })).toBeDefined();

// Mock calls
expect(mockFunction).toHaveBeenCalledWith('arg1', 'arg2');
expect(mockFunction).toHaveBeenCalledTimes(1);

// Async updates
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});
```
