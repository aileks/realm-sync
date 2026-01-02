# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-02 13:15
**Branch:** (current)
**Stack:** TanStack Start + Convex + Bun + Tailwind v4

## OVERVIEW

Full-stack React 19 application using TanStack Router file-based routing, Convex backend, and server-side rendering via Nitro. Bun as primary runtime.

## STRUCTURE

```
./
├── convex/           # Convex backend (schema, functions, auth)
├── src/
│   ├── routes/       # File-based routes (TanStack Router)
│   ├── hooks/        # Custom React hooks
│   ├── components/   # UI components
│   ├── integrations/ # External service providers (Convex)
│   ├── data/         # Static data
│   ├── router.tsx    # Router initialization
│   ├── env.ts        # Type-safe env vars (T3Env)
│   └── routeTree.gen.ts  # Auto-generated (NEVER EDIT)
└── instrument.server.mjs  # Sentry instrumentation
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add route | `src/routes/` | File-based; auto-generates route tree |
| Backend logic | `convex/` | Schema in `schema.ts`, functions in `todos.ts` |
| Env config | `src/env.ts` | T3Env with Zod validation |
| Styling | `src/styles.css` | Tailwind v4 CSS-first config |
| Server instrumentation | `instrument.server.mjs` | Sentry/OpenTelemetry |

## CONVENTIONS

- **Path aliases**: `@/*` → `./src/*`
- **Package manager**: `bun` (not npm/yarn/pnpm)
- **Routing**: Dotted nesting (`.` in filename) for flat route structure
- **Demo files**: `demo.*` prefixed files are placeholders; delete when stabilizing
- **Route tree**: `routeTree.gen.ts` is auto-generated; mark read-only in VS Code

## ANTI-PATTERNS (THIS PROJECT)

- **Convex system indices**: NEVER add indices for `_id` or `_creationTime` (auto-handled)
- **Empty strings in `.env`**: Unless `emptyStringAsUndefined: true`, empty strings are values, not defaults
- **Mishandled validators**: Convex `v` validators are "often mishandled"
- **Uninstrumented server functions**: All `createServerFn` should wrap with `Sentry.startSpan`

## COMMANDS

```bash
# Dev with instrumentation
bun run dev

# Build production
bun run build

# Run tests
bun run test

# Start production (requires build)
bun run start

# Convex
npx convex dev      # Local dev
npx convex deploy   # Deploy to prod
```

## NOTES

- No `index.html` or `main.tsx`; TanStack Start handles entry dynamically
- Server instrumentation injected via `NODE_OPTIONS='--import ./instrument.server.mjs'`
- Tailwind v4 uses CSS-first config (no `tailwind.config.js`)
