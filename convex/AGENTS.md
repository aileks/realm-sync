# convex/

**Scope:** Real-time backend—database, server functions, subscriptions

## STRUCTURE

```
convex/
├── _generated/      # Auto-generated types (NEVER EDIT)
├── lib/
│   └── auth.ts      # Auth helper functions (getAuthUserId, requireAuth)
├── auth.ts          # Convex Auth configuration (Google + Password)
├── http.ts          # HTTP router for auth endpoints
├── schema.ts        # Table definitions (defineSchema, defineTable)
├── projects.ts      # Project CRUD operations
├── documents.ts     # Document CRUD operations
├── storage.ts       # File upload/download
└── tsconfig.json    # Convex-specific TS config
```

## WHERE TO LOOK

| Task            | Location                 | Notes                                        |
| --------------- | ------------------------ | -------------------------------------------- |
| Define tables   | `schema.ts`              | Use `v` validators strictly                  |
| Write functions | `*.ts` (not \_generated) | Named exports: `export const x = query(...)` |
| Types           | `_generated/server.d.ts` | Auto-regenerated on schema change            |

## CURRENT SCHEMA

| Table | Fields | Notes |
| --- | --- | --- |
| `users` | `name`, `email`, `image`, `createdAt`, `settings` | Extended from Convex Auth |
| `projects` | `userId`, `name`, `description`, `createdAt`, `updatedAt`, `stats` | Project management |
| `documents` | `projectId`, `title`, `content`, `storageId`, `contentType`, `orderIndex`, `wordCount`, `createdAt`, `updatedAt`, `processedAt`, `processingStatus` | Document storage & tracking |
| `entities` | `projectId`, `name`, `type`, `description`, `aliases`, `firstMentionedIn`, `createdAt`, `updatedAt` | Placeholder for Phase 2 |
| `facts` | `projectId`, `entityId`, `documentId`, `subject`, `predicate`, `object`, `confidence`, `evidenceSnippet`, `evidencePosition`, `temporalBound`, `status`, `createdAt` | Placeholder for Phase 2 |
| `alerts` | `projectId`, `documentId`, `factIds`, `entityIds`, `type`, `severity`, `title`, `description`, `evidence`, `suggestedFix`, `status`, `resolutionNotes`, `createdAt`, `resolvedAt` | Placeholder for Phase 4 |
| `llmCache` | `inputHash`, `promptVersion`, `modelId`, `response`, `tokenCount`, `createdAt`, `expiresAt` | LLM response caching |

## FUNCTION PATTERNS

```typescript
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import * as Sentry from '@sentry/tanstackstart-react';

// Query with index filtering
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query('projects')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .collect();
  },
});

// Mutation with Sentry instrumentation
export const create = mutation({
  args: { name: v.string() },
  handler: Sentry.startSpan({ name: 'createProject' }, async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');
    return await ctx.db.insert('projects', { userId, name: args.name });
  }),
});

// Update pattern
export const update = mutation({
  args: { id: v.id('projects'), name: v.optional(v.string()) },
  handler: Sentry.startSpan({ name: 'updateProject' }, async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    if (!project) throw new Error('Project not found');
    const userId = await getAuthUserId(ctx);
    if (project.userId !== userId) throw new Error('Unauthorized');
    return await ctx.db.patch(args.id, { name: args.name, updatedAt: Date.now() });
  }),
});

async function getAuthUserId(ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const user = await ctx.db
    .query('users')
    .withIndex('by_email', (q) => q.eq('email', identity.email))
    .first();
  return user?._id || null;
}
```

## CONVENTIONS

- Named exports: `export const funcName = query(...)`
- Always define `args` with `v` validators
- Use proper indexes for queries (see schema indices)
- Use `ctx.db.get(id)` + `ctx.db.patch(id, {...})` for updates
- Throw explicit errors for not-found cases
- Wrap mutations with `Sentry.startSpan({ name: '...' }, async (ctx, args) => {...})`

## ANTI-PATTERNS

| Pattern                             | Why                              |
| ----------------------------------- | -------------------------------- |
| Indices on `_id` or `_creationTime` | Auto-handled by Convex           |
| Manual partial writes               | Convex mutations are atomic      |
| Validation in handler (not args)    | Use `v` validators in `args`     |
| Editing `_generated/*`              | Will be overwritten              |
| Silent failures                     | Throw errors when data not found |

## INTEGRATION

- Frontend uses `ConvexAuthProvider` from `@convex-dev/auth/react`
- Provider in `src/integrations/convex/provider.tsx`
- Auth helpers in `convex/lib/auth.ts`: `getAuthUserId()`, `requireAuth()`, `getCurrentUser()`
- Auth providers: Google OAuth, Email/Password

## COMMANDS

```bash
npx convex dev           # Start dev server (auto-reloads)
npx convex deploy        # Deploy to production
```

## NOTES

- Schema changes may prompt migration
- Real-time via Convex query hooks
- Functions auto-reload during `npx convex dev`
- Phase 1 complete: Schema, Auth, Projects, Documents, Storage all implemented
