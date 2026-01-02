# convex/

**Scope:** Real-time backend—database, server functions, subscriptions

## STRUCTURE

```
convex/
├── _generated/      # Auto-generated types (NEVER EDIT)
├── schema.ts        # Table definitions (defineSchema, defineTable)
├── todos.ts         # Query/mutation implementations
└── tsconfig.json    # Convex-specific TS config
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Define tables | `schema.ts` | Use `v` validators strictly |
| Write functions | `*.ts` (not _generated) | Named exports: `export const x = query(...)` |
| Types | `_generated/server.d.ts` | Auto-regenerated on schema change |

## CURRENT SCHEMA

| Table | Fields | Notes |
|-------|--------|-------|
| `todos` | `text`, `completed` | Basic CRUD example |
| `products` | `title`, `imageId`, `price` | Placeholder data |

## FUNCTION PATTERNS

```typescript
// Query pattern
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('todos').order('desc').collect()
  },
})

// Mutation pattern
export const add = mutation({
  args: { text: v.string() },
  handler: async (ctx, { text }) => {
    await ctx.db.insert('todos', { text, completed: false })
  },
})
```

## CONVENTIONS

- Named exports: `export const funcName = query(...)`
- Always define `args` with `v` validators
- Use `ctx.db.query().order().collect()` for lists
- Use `ctx.db.get(id)` + `ctx.db.patch(id, {...})` for updates

## ANTI-PATTERNS

| Pattern | Why |
|---------|-----|
| Indices on `_id` or `_creationTime` | Auto-handled by Convex |
| Manual partial writes | Convex mutations are atomic |
| Validation in handler (not args) | Use `v` validators in `args` |
| Editing `_generated/*` | Will be overwritten |

## INTEGRATION

- Frontend uses `@convex-dev/react-query` bridge
- Provider in `src/integrations/convex/provider.tsx`
- No auth currently implemented

## COMMANDS

```bash
npx convex dev           # Start dev server (auto-reloads)
npx convex deploy        # Deploy to production
npx convex functions     # Manage functions
```

## NOTES

- Schema changes may prompt migration
- Real-time via standard Convex query hooks
- Functions auto-reload during `npx convex dev`
