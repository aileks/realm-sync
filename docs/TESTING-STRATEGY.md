---
summary: This document outlines the testing strategy for the realm-sync project, prioritizing unit and integration tests to achieve 80% code coverage.
read_when: [testing, integration, unit, end-to-end, regression]
---

# Testing Strategy

**Status:** Ready for Implementation **Coverage Target:** 80% (Unit + Integration) **E2E/Visual:** Deferred until MVP

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
    setupFiles: ['./src/test/setup.ts'],
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

### src/test/setup.ts

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

**File:** `convex/todos.test.ts`

Uses `convex-test` for behavior-focused testing of CRUD operations.

```typescript
import { convexTest } from 'convex-test';
import { describe, it, expect, beforeEach } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';

describe('todos', () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema);
  });

  describe('list query', () => {
    it('returns empty array when no todos exist', async () => {
      const todos = await t.query(api.todos.list);
      expect(todos).toEqual([]);
    });

    it('returns todos ordered by creation time (desc)', async () => {
      await t.run(async (ctx) => {
        await ctx.db.insert('todos', { text: 'First', completed: false });
        await ctx.db.insert('todos', { text: 'Second', completed: true });
      });

      const todos = await t.query(api.todos.list);
      expect(todos).toHaveLength(2);
      expect(todos[0].text).toBe('Second');
    });
  });

  describe('add mutation', () => {
    it('creates todo with completed=false by default', async () => {
      const id = await t.mutation(api.todos.add, { text: 'Buy milk' });

      const todo = await t.run(async (ctx) => await ctx.db.get(id));
      expect(todo).toMatchObject({
        text: 'Buy milk',
        completed: false,
      });
      expect(todo?._id).toBeDefined();
      expect(todo?._creationTime).toBeDefined();
    });

    it('rejects empty string via v.string() validation', async () => {
      await expect(async () => {
        await t.mutation(api.todos.add, { text: '' });
      }).rejects.toThrow();
    });
  });

  describe('toggle mutation', () => {
    it('flips completed status', async () => {
      const id = await t.run(
        async (ctx) => await ctx.db.insert('todos', { text: 'Task', completed: false })
      );

      await t.mutation(api.todos.toggle, { id });

      const todo = await t.run(async (ctx) => await ctx.db.get(id));
      expect(todo?.completed).toBe(true);
    });

    it('throws error for non-existent todo', async () => {
      const fakeId = 'nonexistent' as any;

      await expect(async () => {
        await t.mutation(api.todos.toggle, { id: fakeId });
      }).rejects.toThrowError(/todo not found/i);
    });
  });

  describe('remove mutation', () => {
    it('deletes todo from database', async () => {
      const id = await t.run(
        async (ctx) => await ctx.db.insert('todos', { text: 'Delete me', completed: false })
      );

      await t.mutation(api.todos.remove, { id });

      const todo = await t.run(async (ctx) => await ctx.db.get(id));
      expect(todo).toBeNull();
    });
  });
});
```

### 2.2 Utility Functions

**File:** `src/lib/utils.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('handles clsx-compatible inputs', () => {
    expect(cn('text-red-500', { 'bg-blue-500': true })).toContain('text-red-500');
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

| Module                                 | Target  | Type                   |
| -------------------------------------- | ------- | ---------------------- |
| `convex/todos.ts`                      | 100%    | Unit (convex-test)     |
| `src/lib/utils.ts`                     | 100%    | Unit                   |
| `src/env.ts`                           | 100%    | Unit                   |
| `src/components/ui/alert-dialog.tsx`   | 90%     | Integration            |
| `src/components/ui/combobox.tsx`       | 85%     | Integration            |
| `src/components/ui/dropdown-menu.tsx`  | 85%     | Integration            |
| `src/components/Header.tsx`            | 90%     | Integration            |
| `src/components/component-example.tsx` | 80%     | Integration            |
| **Overall**                            | **80%** | **Unit + Integration** |

---

## 5. Implementation Roadmap

### Phase 1: Foundation (Week 1)

- [ ] Create `vitest.config.ts` with edge-runtime
- [ ] Create `src/test/setup.ts`
- [ ] Install `convex-test`
- [ ] Write `convex/todos.test.ts` (100% coverage)
- [ ] Write `src/lib/utils.test.ts` (100% coverage)
- [ ] Write `src/env.test.ts` (100% coverage)

### Phase 2: Component Testing (Week 2)

- [ ] Write `src/components/ui/alert-dialog.test.tsx`
- [ ] Write `src/components/ui/combobox.test.tsx`
- [ ] Write `src/components/ui/dropdown-menu.test.tsx`
- [ ] Write `src/components/Header.test.tsx`
- [ ] Write `src/components/component-example.test.tsx`

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
