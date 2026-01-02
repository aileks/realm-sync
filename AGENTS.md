# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-02
**Commit:** 9c30a82
**Branch:** main
**Stack:** TanStack Start + Convex + Bun + Tailwind v4 + React 19

## OVERVIEW

Full-stack React 19 app with TanStack Router file-based routing, Convex real-time backend, SSR via Nitro, and React Compiler enabled. Sentry instrumentation required for all server functions.

## STRUCTURE

```
./
├── convex/           # Backend (schema, functions) → see convex/AGENTS.md
├── src/
│   ├── routes/       # File-based routes (auto-generates routeTree.gen.ts)
│   ├── components/   # UI components (Shadcn "base-maia" style)
│   ├── integrations/ # External providers (Convex)
│   ├── lib/          # Utilities (cn, etc.)
│   ├── router.tsx    # Router init + client Sentry
│   ├── env.ts        # Type-safe env (T3Env + Zod)
│   └── styles.css    # Tailwind v4 CSS-first config
├── instrument.server.mjs  # Server-side Sentry (injected via NODE_OPTIONS)
└── vite.config.ts    # Nitro + TanStack Start + React Compiler
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add route | `src/routes/` | File-based; dotted nesting (e.g., `demo.start.tsx`) |
| Backend logic | `convex/` | Schema in `schema.ts`, functions in separate files |
| Env vars | `src/env.ts` | T3Env; add before use |
| Styling | `src/styles.css` | Tailwind v4; OKLCH colors |
| UI components | `src/components/ui/` | Shadcn "base-maia" style |
| Root layout | `src/routes/__root.tsx` | Shell, providers, global Header |
| Server instrumentation | `instrument.server.mjs` | Sentry/OpenTelemetry |

## CODE MAP

| Symbol | Location | Role |
|--------|----------|------|
| `getRouter` | `src/router.tsx` | Router factory + Sentry init |
| `RootDocument` | `src/routes/__root.tsx` | HTML shell, ConvexProvider wrapper |
| `AppConvexProvider` | `src/integrations/convex/provider.tsx` | Convex + TanStack Query bridge |
| `env` | `src/env.ts` | Type-safe env access |

## CONVENTIONS

- **Runtime**: `bun` (not npm/yarn/pnpm)
- **Path aliases**: `@/*` → `./src/*`
- **Routing**: Dotted filenames for nested routes
- **Typography**: DM Sans (`@fontsource-variable/dm-sans`)
- **Colors**: OKLCH exclusively
- **UI primitives**: Shadcn/Base UI—never build custom modals/dropdowns/buttons
- **Demo files**: `demo.*` prefixed = placeholders; delete when stabilizing

## ANTI-PATTERNS

| Pattern | Why Forbidden |
|---------|---------------|
| Edit `routeTree.gen.ts` | Auto-generated; will be overwritten |
| Edit `convex/_generated/` | Auto-generated |
| `createServerFn` without Sentry | Must wrap with `Sentry.startSpan` |
| Convex indices on `_id`/`_creationTime` | Auto-handled by Convex |
| Empty env strings without `emptyStringAsUndefined` | Empty string ≠ undefined |
| Custom UI components when Shadcn provides | Use library primitives |
| Mishandled Convex `v` validators | Follow existing patterns strictly |

## COMMANDS

```bash
# Dev
bun run dev              # Vite + Sentry instrumentation (port 3000)
npx convex dev           # Convex local dev server

# Build/Prod
bun run build            # Production build
bun run start            # Run production (requires build)

# Test
bun run test             # Vitest

# Convex
npx convex deploy        # Deploy to prod
```

## NOTES

- No `index.html` or `main.tsx`—TanStack Start handles entry dynamically
- React Compiler enabled via `babel-plugin-react-compiler`
- Nitro is the server engine (configured in vite.config.ts)
- Tailwind v4 = CSS-first (no `tailwind.config.js`)
- Header has dead links to removed demo routes (`/demo/*`)—cleanup pending

## CODING GUIDELINES

- Execute requests immediately; no fluff
- WCAG AAA accessibility
- Rendering performance awareness (repaint/reflow costs)
- Minimalism: if element has no purpose, delete it
- Anti-generic: reject template layouts; strive for bespoke design
