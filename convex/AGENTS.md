---
read_when: working on Convex backend (database, functions, auth)
---

# convex/

**Scope:** Real-time backend—database, server functions, subscriptions

## STRUCTURE

```
convex/
├── _generated/      # Auto-generated types (NEVER EDIT)
├── __tests__/       # Test files (convex-test) - 13 test files
│   ├── entities/    # Entity query/mutation tests + helpers.ts
│   ├── llm/         # LLM extraction, caching, chunking tests
│   └── lib/         # Auth, errors, result tests
├── lib/
│   ├── auth.ts      # Auth helpers (getAuthUserId, requireAuth, getCurrentUser, requireAuthUser)
│   ├── errors.ts    # Error types (AppError, AuthError, NotFoundError, ValidationError, ConfigurationError, ApiError)
│   └── result.ts    # Result utilities (unwrapOrThrow, safeJsonParse) + neverthrow re-exports
├── llm/
│   ├── cache.ts     # LLM response caching (7-day TTL, SHA-256 hashing)
│   ├── chunk.ts     # Document chunking (MAX_CHUNK_CHARS=12000, OVERLAP_CHARS=800)
│   ├── extract.ts   # Extraction action + processExtractionResult (with chunking)
│   └── utils.ts     # Hash utilities (crypto.subtle.digest)
├── auth.config.ts   # Auth provider configuration
├── auth.ts          # Convex Auth setup (Google + Password)
├── documents.ts     # Document CRUD operations
├── entities.ts      # Entity CRUD + merge + timeline + relationship graph (844 lines)
├── facts.ts         # Fact CRUD + confirm/reject
├── chat.ts          # Vellum streaming chat (sendMessage, streamChat httpAction)
├── http.ts          # HTTP router for auth + chat endpoints
├── cleanup.ts       # Scheduled cleanup jobs
├── crons.ts         # Cron job definitions
├── projects.ts      # Project CRUD operations
├── schema.ts        # Table definitions (defineSchema, defineTable)
├── seed.ts          # Demo data seeding (seedDemoData, clearSeedData) - 811 lines
├── storage.ts       # File upload/download
├── users.ts         # User query (viewer)
└── tsconfig.json    # Convex-specific TS config
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Define tables | `schema.ts` | Use `v` validators strictly |
| Write functions | `*.ts` (not \_generated) | Named exports: `export const x = query(...)` |
| Types | `_generated/server.d.ts` | Auto-regenerated on schema change |
| Auth helpers | `lib/auth.ts` | 4 functions for different auth patterns |
| Error handling | `lib/errors.ts` | 5 error types + factory functions |
| Result pattern | `lib/result.ts` | unwrapOrThrow, safeJsonParse, neverthrow re-exports |
| LLM operations | `llm/` | extract.ts orchestrates, cache.ts stores, chunk.ts splits |
| Tests | `__tests__/*.test.ts` | convex-test patterns with helpers |

## CURRENT SCHEMA

| Table | Key Fields | Notes |
| --- | --- | --- |
| `users` | name, email, settings | Extended from Convex Auth |
| `projects` | userId, name, stats | User-owned projects |
| `documents` | projectId, title, content, processingStatus | Document storage |
| `entities` | projectId, name, type, aliases, status | Canon entities (pending/confirmed) |
| `facts` | projectId, entityId, subject, predicate, object, status | Canon facts (pending/confirmed/rejected) |
| `alerts` | projectId, type, severity, status | Phase 4 placeholder |
| `llmCache` | inputHash, promptVersion, response | LLM response caching (7-day TTL) |

## AUTH PATTERNS

```typescript
// Query: return empty/null for unauthenticated
export const list = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    // ... fetch user's data
  },
});

// Mutation: throw for unauthenticated
export const create = mutation({
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    // ... create with userId
  },
});

// Get full user object
export const getProfile = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return user;
  },
});

// Require full user (throws if missing)
export const updateProfile = mutation({
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    // ... user guaranteed to exist
  },
});
```

## ERROR HANDLING PATTERN

```typescript
import { authError, notFoundError, validationError } from './lib/errors';
import { unwrapOrThrow } from './lib/result';

// Use Result pattern for operations that might fail
const project = unwrapOrThrow(
  await verifyProjectAccess(ctx, projectId, userId)
);

// Error factories return err() from neverthrow
if (!hasAccess) return authError('Not authorized');
if (!entity) return notFoundError('Entity not found');
if (invalid) return validationError('Invalid input', details);
```

## VALIDATOR PATTERNS

```typescript
// Reusable validators
const entityTypeValidator = v.union(
  v.literal('character'),
  v.literal('location'),
  v.literal('item'),
  v.literal('concept'),
  v.literal('event')
);

const entityStatusValidator = v.union(
  v.literal('pending'),
  v.literal('confirmed')
);

// Complex nested objects
stats: v.optional(
  v.object({
    documentCount: v.number(),
    entityCount: v.number(),
    factCount: v.number(),
  })
);

// Foreign keys
projectId: v.id('projects');
userId: v.id('users');
```

## INDEX PATTERNS

```typescript
// Single-field index
.index('by_email', ['email'])

// Multi-field index (for user + ordering)
.index('by_user', ['userId', 'updatedAt'])

// Composite filter index
.index('by_project_status', ['projectId', 'status'])

// Search index
.searchIndex('search_name', {
  searchField: 'name',
  filterFields: ['projectId']
})
```

## LLM MODULE PATTERNS

```typescript
// Constants (llm/chunk.ts)
MAX_CHUNK_CHARS = 12000   // Document chunk size
OVERLAP_CHARS = 800       // Context overlap between chunks
MIN_CHUNK_CHARS = 1000    // Min before boundary search
PROMPT_VERSION = 'v1'     // Cache key component

// Internal vs Public functions
internalAction → extractFromDocument (chunk-level)
action → chunkAndExtract (public entry point)
internalQuery → checkCache, computeHash
internalMutation → saveToCache

// Cache key structure
{ inputHash, promptVersion, modelId }
```

## CONVENTIONS

- Named exports: `export const funcName = query(...)`
- Always define `args` with `v` validators
- Use proper indexes for queries
- Use `ctx.db.get(id)` + `ctx.db.patch(id, {...})` for updates
- Throw explicit errors: `throw new Error('Project not found')`
- Queries return null/empty for auth failures (no throw)
- Mutations throw for auth failures
- Use `unwrapOrThrow()` to convert Result to value or throw
- Internal functions use `internal.<module>.<function>` access pattern

## ANTI-PATTERNS

| Pattern                             | Why                                |
| ----------------------------------- | ---------------------------------- |
| Indices on `_id` or `_creationTime` | Auto-handled by Convex             |
| Validation in handler (not args)    | Use `v` validators in `args`       |
| Editing `_generated/*`              | Will be overwritten                |
| Silent failures                     | Throw errors when data not found   |
| `getAuthUserId` in mutations        | Use `requireAuth` instead          |
| Manual try/catch                    | Use Result pattern from lib/errors |
| Throwing in queries                 | Return null/empty instead          |

## COMMANDS

```bash
npx convex dev           # Start dev server (auto-reloads)
npx convex deploy        # Deploy to production
```

## NOTES

- Schema changes may prompt migration
- Real-time via Convex query hooks (useQuery)
- Functions auto-reload during `npx convex dev`
- 173 tests passing across 13 test files
- Cascade deletes: manually delete related documents before project
- Stats sync: every CRUD operation patches project.stats
- entities.ts (844 lines) is largest file - consider splitting if extending
- LLM caching: 7-day TTL, SHA-256 content hash
