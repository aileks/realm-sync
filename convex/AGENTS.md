---
read_when: working on Convex backend (database, functions, auth)
---

# convex/

**Scope:** Real-time backend—database, server functions, subscriptions

## STRUCTURE

```
convex/
├── _generated/      # Auto-generated types (NEVER EDIT)
├── __tests__/       # Test files (convex-test)
├── lib/
│   ├── auth.ts      # Auth helpers (getAuthUserId, requireAuth, getCurrentUser, requireAuthUser)
│   ├── errors.ts    # Error types (AppError, AuthError, NotFoundError, ValidationError)
│   └── result.ts    # Result utilities (unwrapOrThrow, safeJsonParse)
├── llm/
│   ├── cache.ts     # LLM response caching
│   ├── chunk.ts     # Document chunking for large texts
│   ├── extract.ts   # Extraction action + processExtractionResult (with chunking)
│   └── utils.ts     # Hash utilities
├── auth.config.ts   # Auth provider configuration
├── auth.ts          # Convex Auth setup (Google + Password)
├── documents.ts     # Document CRUD operations
├── entities.ts      # Entity CRUD + merge
├── facts.ts         # Fact CRUD + confirm/reject
├── chat.ts          # Vellum streaming chat (sendMessage, streamChat httpAction)
├── http.ts          # HTTP router for auth + chat endpoints
├── cleanup.ts       # Scheduled cleanup jobs
├── crons.ts         # Cron job definitions
├── projects.ts      # Project CRUD operations
├── schema.ts        # Table definitions (defineSchema, defineTable)
├── seed.ts          # Demo data seeding (seedDemoData, clearSeedData)
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
| Tests | `projects.test.ts` | convex-test patterns |

## CURRENT SCHEMA

| Table | Key Fields | Notes |
| --- | --- | --- |
| `users` | name, email, settings | Extended from Convex Auth |
| `projects` | userId, name, stats | User-owned projects |
| `documents` | projectId, title, content, processingStatus | Document storage |
| `entities` | projectId, name, type, aliases, status | Canon entities (pending/confirmed) |
| `facts` | projectId, entityId, subject, predicate, object, status | Canon facts (pending/confirmed/rejected) |
| `alerts` | projectId, type, severity, status | Phase 4 placeholder |
| `llmCache` | inputHash, promptVersion, response | LLM response caching |

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
```

## VALIDATOR PATTERNS

```typescript
// Reusable validators
const statusValidator = v.union(
  v.literal('pending'),
  v.literal('processing'),
  v.literal('completed')
);

// Complex nested objects
stats: v.optional(
  v.object({
    documentCount: v.number(),
    entityCount: v.number(),
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

// Search index
.searchIndex('search_content', {
  searchField: 'content',
  filterFields: ['projectId']
})
```

## CONVENTIONS

- Named exports: `export const funcName = query(...)`
- Always define `args` with `v` validators
- Use proper indexes for queries
- Use `ctx.db.get(id)` + `ctx.db.patch(id, {...})` for updates
- Throw explicit errors: `throw new Error('Project not found')`
- Queries return null/empty for auth failures (no throw)
- Mutations throw for auth failures

## ANTI-PATTERNS

| Pattern                             | Why                              |
| ----------------------------------- | -------------------------------- |
| Indices on `_id` or `_creationTime` | Auto-handled by Convex           |
| Validation in handler (not args)    | Use `v` validators in `args`     |
| Editing `_generated/*`              | Will be overwritten              |
| Silent failures                     | Throw errors when data not found |
| `getAuthUserId` in mutations        | Use `requireAuth` instead        |

## COMMANDS

```bash
npx convex dev           # Start dev server (auto-reloads)
npx convex deploy        # Deploy to production
```

## NOTES

- Schema changes may prompt migration
- Real-time via Convex query hooks (useQuery)
- Functions auto-reload during `npx convex dev`
- All 173 tests passing across 13 test files (projects, documents, entities/mutations, entities/queries, facts, seed, llm/cache, llm/chunk, llm/extract, lib/auth, lib/errors, lib/result, utils)
- Cascade deletes: manually delete related documents before project
