---
read_when: working with Convex auth, errors, or Result pattern
---

# convex/lib/

**Scope:** Cross-cutting backend utilities—auth, error handling, Result pattern

## STRUCTURE

```
lib/
├── auth.ts           # 4 auth helper functions (getAuthUserId, requireAuth, getCurrentUser, requireAuthUser)
├── errors.ts         # 5 error types + factory functions (AppError hierarchy)
└── result.ts        # Result pattern utilities (unwrapOrThrow, safeJsonParse)
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Auth in queries | `getAuthUserId()` | Returns null for unauthenticated |
| Auth in mutations | `requireAuth()` | Throws for unauthenticated |
| Error factories | `errors.ts` | authError, notFoundError, validationError, etc. |
| Result unwrapping | `unwrapOrThrow()` | Converts Result to value or throws |
| JSON parsing | `safeJsonParse()` | Returns Result with ValidationError |

## AUTH PATTERN

```typescript
import {
  getAuthUserId,
  requireAuth,
  getCurrentUser,
  requireAuthUser,
} from './lib/auth';

// Query: return null/empty for unauthenticated
export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    // ... fetch data
  },
});

// Mutation: throw for unauthenticated
export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await requireAuth(ctx);
    // userId guaranteed to exist
  },
});

// Get full user object
export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return user;
  },
});

// Require full user (throws if missing)
export const updateProfile = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const user = await requireAuthUser(ctx);
    // user guaranteed to exist and be populated
  },
});
```

## ERROR TYPE HIERARCHY

```typescript
import {
  authError,
  notFoundError,
  validationError,
  configError,
  apiError,
} from './lib/errors';

type AppError =
  | AuthError
  | NotFoundError
  | ValidationError
  | ConfigurationError
  | ApiError;

// Auth errors (unauthenticated/unauthorized)
authError('UNAUTHENTICATED', 'Authentication required');
authError('UNAUTHORIZED', 'Access denied');

// Not found errors
notFoundError('project', projectId);
notFoundError('entity', entityId);

// Validation errors
validationError('email', 'Invalid email format');
validationError('projectId', 'Project does not exist');

// Configuration errors
configError('OPENROUTER_API_KEY', 'Missing API key');

// API errors
apiError(500, 'Internal server error', details);
```

## RESULT PATTERN

```typescript
import { unwrapOrThrow, safeJsonParse } from './lib/result';
import { ok, err } from 'neverthrow';

// Verification function pattern
async function verifyProjectAccess(
  ctx: MutationCtx,
  projectId: Id<'projects'>,
  userId: Id<'users'>
): Promise<Result<Doc<'projects'>, AppError>> {
  const project = await ctx.db.get(projectId);
  if (!project) return err(notFoundError('project', projectId));
  if (project.userId !== userId)
    return err(authError('UNAUTHORIZED', 'Unauthorized'));
  return ok(project);
}

// In mutation handler
export const updateProject = mutation({
  args: { projectId: v.id('projects'), name: v.string() },
  handler: async (ctx, { projectId, name }) => {
    const userId = await requireAuth(ctx);
    const project = unwrapOrThrow(
      await verifyProjectAccess(ctx, projectId, userId)
    );
    // project guaranteed to exist and be accessible
    await ctx.db.patch(projectId, { name });
    return projectId;
  },
});

// Safe JSON parsing
const result = safeJsonParse(jsonString);
if (result.isErr()) {
  console.error('Parse error:', result.error);
}
const data = result.value;
```

## CONVENTIONS

- **Queries**: Use `getAuthUserId()` - return null/empty for unauthenticated
- **Mutations**: Use `requireAuth()` - throw for unauthenticated
- **Verification**: Return `Result<T, AppError>` from verification functions
- **Unwrapping**: Use `unwrapOrThrow()` in handlers after verification
- **Error factories**: Always use from `errors.ts` (not direct Error())
- **Auth helpers**: Never mix - choose one per function based on need

## ANTI-PATTERNS

| Pattern | Why |
| --- | --- |
| `getAuthUserId()` in mutations | Use `requireAuth()` instead (throws vs null) |
| Manual error throwing in queries | Return null/empty instead |
| Direct `throw new Error()` | Use error factories from `errors.ts` |
| `try/catch` everywhere | Use Result pattern for recoverable errors |
| Unwrapping Result without check | Use `unwrapOrThrow()` to convert or throw |

## NOTES

- All 4 auth functions wrap `@convex-dev/auth/server` with consistent patterns
- Error types are discriminated unions - use `error.type` in type guards
- `unwrapOrThrow()` converts neverthrow Result to value or throws formatted error
- `safeJsonParse()` returns `Result<T, ValidationError>` for safe parsing
