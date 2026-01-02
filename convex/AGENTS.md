# convex/

**Scope:** Backend database, server functions, auth, and real-time subscriptions

## STRUCTURE

```
convex/
├── _generated/      # Auto-generated types (NEVER EDIT)
├── schema.ts        # Table definitions
├── todos.ts         # Server function implementations
└── tsconfig.json    # Convex-specific TypeScript config
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Define tables | `schema.ts` | Uses Convex `defineSchema`, `defineTable` |
| Write server functions | `todos.ts` | `query` and `mutation` exports |
| Type safety | `_generated/server.d.ts` | Auto-regenerated |

## CONVENTIONS

- **Functions**: Named exports in `todos.ts` (`export const queryName = query(...)`)
- **Schema**: Use `defineTable` with `v.field()` validators
- **Validation**: Convex `v` validators often mishandled—follow patterns in existing code

## ANTI-PATTERNS

- **NEVER add indices for `_id` or `_creationTime`** (auto-handled)
- **Never use partial writes** (Convex guarantees atomicity)
- **Always wrap `createServerFn` with `Sentry.startSpan`**

## COMMANDS

```bash
npx convex dev      # Start dev server + database
npx convex deploy   # Deploy to prod
npx convex functions upload  # Push function changes
```

## NOTES

- Functions auto-reload on file save during `npx convex dev`
- Schema changes require migration (prompted by CLI)
- Real-time subscriptions work via standard Convex query hooks
