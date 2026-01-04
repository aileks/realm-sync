---
summary: This document outlines the testing strategy for the realm-sync project, prioritizing unit and integration tests to achieve 80% code coverage.
read_when: [testing, integration, unit, end-to-end, regression]
---

# Testing Strategy

**Status:** Ready for Implementation **Coverage Target:** 80% (Unit + Integration) **E2E/Visual:** Deferred until MVP **Current Test Count:** 151 passing

**_FOLLOW TDD! TEST BEHAVIOR, NOT IMPLEMENTATION!_**

- Exception: Specific edge cases must be verified.

---

## Overview

This document outlines the testing strategy for the realm-sync project, prioritizing unit and integration tests to achieve 80% code coverage. End-to-end and visual regression testing will be added after the first shippable feature.

## Test Pyramid

```
        /\
       /E2E\      ← 10% - Critical user paths only (MVP+)
      /─────\
     /Int'gr\    ← 30% - Component + Convex integration
    /───────\
   /  Unit  \   ← 60% - Utilities, Convex functions, business logic
  /───────────\
```

---

## 1. Configuration

### Dependencies

```bash
pnpm add -D convex-test @edge-runtime/vm
```

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'edge-runtime',
    setupFiles: ['./src/__tests__/setup.ts'],
    server: { deps: { inline: ['convex-test'] } },
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'convex/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.output/',
        'convex/_generated/',
        'src/test/',
        '**/*.d.ts',
        '**/__tests__/**',
        'routeTree.gen.ts',
      ],
    },
  },
});
```

### src/**tests**/setup.ts

```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

---

## 2. Unit Tests

### 2.1 Convex Functions

**File:** `convex/projects.test.ts`

Uses `convex-test` for behavior-focused testing of project CRUD and authorization.

```typescript
import { convexTest } from 'convex-test';
import { describe, it, expect, beforeEach } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';

describe('projects', () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema);
  });

  describe('list query', () => {
    it('returns empty array when no projects exist', async () => {
      t.requestId = 'user_123'; // Mock auth
      const projects = await t.query(api.projects.list, {});
      expect(projects).toEqual([]);
    });
  });
});
```

### 2.2 Utility Functions

**File:** `src/lib/utils.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { cn, toId } from './utils';

describe('cn', () => {
  it('merges tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });
});

describe('toId', () => {
  it('converts string to typed Convex ID', () => {
    const id = toId<'projects'>('jd7... ');
    expect(id).toBeDefined();
  });
});
```

### 2.3 Environment Validation

**File:** `src/env.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { env } from './env';

describe('env', () => {
  it('has VITE_APP_TITLE defined', () => {
    expect(env.VITE_APP_TITLE).toBeDefined();
  });

  it('SERVER_URL is optional', () => {
    expect(env.SERVER_URL).toBeUndefined();
  });
});
```

---

## 3. Integration Tests

### 3.1 UI Components (Behavior-Focused)

**File:** `src/components/ui/alert-dialog.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogAction, AlertDialogCancel } from './alert-dialog'

describe('AlertDialog', () => {
  it('renders trigger button', () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger render={<button>Open</button>} />
        <AlertDialogContent>
          <p>Confirm action?</p>
          <AlertDialogAction>Confirm</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    )
    expect(screen.getByRole('button', { name: /open/i })).toBeInTheDocument()
  })

  it('opens dialog on trigger click', async () => {
    const user = userEvent.setup()

    render(
      <AlertDialog>
        <AlertDialogTrigger render={<button>Open</button>} />
        <AlertDialogContent>
          <p>Are you sure?</p>
        </AlertDialogContent>
      </AlertDialog>
    )

    await user.click(screen.getByRole('button', { name: /open/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes on action click', async () => {
    const user = userEvent.setup()

    render(
      <AlertDialog open={true}>
        <AlertDialogTrigger render={<button>Open</button>} />
        <AlertDialogContent>
          <p>Confirm?</p>
          <AlertDialogAction>Yes</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    )

    await user.click(screen.getByRole('button', { name: /yes/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes on cancel click', async () => {
    const user = userEvent.setup()

    render(
      <AlertDialog open={true}>
        <AlertDialogContent>
          <p>Cancel?</p>
          <AlertDialogCancel>No</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    )

    await user.click(screen.getByRole('button', { name: /no/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes on ESC key', async () => {
    const user = userEvent.setup()

    render(
      <AlertDialog open={true}>
        <AlertDialogContent>
          <p>Press ESC to close</p>
        </AlertDialogContent>
      </AlertDialog>
    )

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('has correct ARIA attributes', async () => {
    const user = userEvent.setup()

    render(
      <AlertDialog>
        <AlertDialogTrigger render={<button>Open</button>} />
        <AlertDialogContent>
          <p>Dialog content</p>
        </AlertDialogContent>
      </AlertDialog>
    )

    await user.click(screen.getByRole('button', { name: /open/i }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('role', 'dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })
})
```

### 3.2 Header Navigation

**File:** `src/components/Header.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Header from './Header'
import { MemoryRouter } from '@tanstack/react-router'

describe('Header', () => {
  const renderWithRouter = (initialPath = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Header />
      </MemoryRouter>
    )
  }

  it('renders menu button', () => {
    renderWithRouter()
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument()
  })

  it('opens drawer on menu button click', async () => {
    const user = userEvent.setup()
    renderWithRouter()

    await user.click(screen.getByRole('button', { name: /open menu/i }))
    expect(screen.getByRole('complementary')).toHaveAttribute('aria-label', 'Navigation')
  })

  it('closes drawer on close button click', async () => {
    const user = userEvent.setup()
    renderWithRouter()

    await user.click(screen.getByRole('button', { name: /open menu/i }))
    expect(screen.getByRole('complementary')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /close menu/i }))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('closes drawer on link click', async () => {
    const user = userEvent.setup()
    renderWithRouter()

    await user.click(screen.getByRole('button', { name: /open menu/i }))
    await user.click(screen.getByRole('link', { name: /home/i }))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('has accessible labels on all interactive elements', () => {
    renderWithRouter()

    expect(screen.getByRole('button', { name: /open menu/i })).toHaveAttribute('aria-label')
  })
})
```

### 3.3 Form Validation (Behavior-Focused)

**File:** `src/components/component-example.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComponentExample } from './component-example'

describe('FormExample', () => {
  it('shows validation error on empty required field submit', async () => {
    const user = userEvent.setup()
    render(<ComponentExample />)

    await user.click(screen.getByRole('button', { name: /form/i }))
    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
  })

  it('accepts valid form input', async () => {
    const user = userEvent.setup()
    render(<ComponentExample />)

    await user.click(screen.getByRole('button', { name: /form/i }))
    await user.type(screen.getByLabelText(/name/i), 'John Doe')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(screen.queryByText(/required/i)).not.toBeInTheDocument()
  })
})
```

---

## 4. Coverage Targets

| Module                  | Target  | Type                   | Tests   |
| ----------------------- | ------- | ---------------------- | ------- |
| `convex/projects.ts`    | 100%    | Unit (convex-test)     | 16      |
| `convex/documents.ts`   | 100%    | Unit (convex-test)     | 13      |
| `convex/entities.ts`    | 100%    | Unit (convex-test)     | 26      |
| `convex/facts.ts`       | 100%    | Unit (convex-test)     | 19      |
| `convex/seed.ts`        | 100%    | Unit (convex-test)     | 7       |
| `convex/llm/extract.ts` | 90%     | Unit (convex-test)     | 12      |
| `convex/llm/cache.ts`   | 100%    | Unit (convex-test)     | 7       |
| `convex/llm/chunk.ts`   | 100%    | Unit                   | 20      |
| `convex/lib/auth.ts`    | 100%    | Unit (convex-test)     | 6       |
| `convex/lib/errors.ts`  | 100%    | Unit                   | 8       |
| `convex/lib/result.ts`  | 100%    | Unit                   | 10      |
| `src/lib/utils.ts`      | 100%    | Unit                   | 7       |
| **Overall**             | **80%** | **Unit + Integration** | **151** |

---

## 5. Implementation Roadmap

### Phase 1: Foundation (Completed)

- [x] Create `vitest.config.ts` with jsdom
- [x] Create `src/__tests__/setup.ts`
- [x] Install `convex-test`
- [x] Write `convex/projects.test.ts` (100% coverage)
- [x] Write `src/lib/utils.test.ts` (100% coverage)

### Phase 2: Core Logic (Completed)

- [x] Write `convex/entities.test.ts` (26 tests)
- [x] Write `convex/facts.test.ts` (19 tests)
- [x] Write `convex/llm/extract.test.ts` (12 tests)
- [x] Write `convex/lib/auth.test.ts` (6 tests)
- [x] Write `convex/lib/errors.test.ts` (8 tests)
- [x] Write `convex/lib/result.test.ts` (10 tests)

### Phase 3: Component Testing (In Progress)

- [ ] Write `src/components/ui/alert-dialog.test.tsx`
- [ ] Write `src/components/Header.test.tsx`

### Phase 3: Visual Regression (MVP+)

- [ ] Set up Storybook
- [ ] Create component stories
- [ ] Configure Chromatic
- [ ] Add visual diff CI check

### Phase 4: E2E (MVP+)

- [ ] Install Playwright
- [ ] Write critical path tests
- [ ] Add E2E CI job

---

## 6. Key Patterns

### Testing Convex with Behavior Focus

```typescript
// ✅ GOOD - Test behavior
it('toggles completed status', async () => {
  const id = await t.run(
    async (ctx) => await ctx.db.insert('todos', { text: 'Task', completed: false })
  );

  await t.mutation(api.todos.toggle, { id });

  const todo = await t.run(async (ctx) => await ctx.db.get(id));
  expect(todo?.completed).toBe(true);
});

// ❌ BAD - Testing implementation details
it('calls ctx.db.patch correctly', async () => {
  // Don't spy on internal implementation
});
```

### Mocking Convex in React Tests

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ComponentExample } from './component-example'

vi.mock('@convex-dev/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: [{ _id: '1', text: 'Test', completed: false }],
    isLoading: false,
  })),
  useMutation: vi.fn(() => vi.fn()),
}))

describe('ComponentExample with Convex', () => {
  it('renders todos from query', () => {
    render(<ComponentExample />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
})
```

### Error Testing

```typescript
// ✅ GOOD - Case-insensitive match
await expect(async () => {
  await t.mutation(api.todos.toggle, { id: fakeId });
}).rejects.toThrowError(/todo not found/i);

// ❌ BAD - Hard-coded error message
await expect(async () => {
  await t.mutation(api.todos.toggle, { id: fakeId });
}).rejects.toThrowError('Todo not found');
```

### ID Handling

```typescript
// ✅ GOOD - Check it's defined
expect(id).toBeDefined();

// ❌ BAD - Testing ID format
expect(id).toMatch(/^[a-z0-9]{24}$/);
```

---

## 7. CI Configuration

```yaml
name: Tests
on: [push, pull_request]

jobs:
  unit-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-pnpm@v1
      - run: pnpm install
      - run: pnpm run test:coverage
      - uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  visual-regression:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-pnpm@v1
      - run: pnpm install
      - run: pnpm run chromatic --exit-zero-on-changes
```

---

## 8. Commands

```bash
# Run tests
pnpm test

# Run with coverage
pnpm run test:coverage

# Run with UI
pnpm run test:ui
```

---

## Resources

- [Convex Testing Guide](https://docs.convex.dev/testing/convex-test)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library)
