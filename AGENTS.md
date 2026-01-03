# PROJECT KNOWLEDGE BASE

Be extremely concise. Sacrifice grammer for the sake of concision.

## OVERVIEW

Full-stack React 19 app with TanStack Router file-based routing, Convex real-time backend, SSR via Nitro, and React Compiler enabled. Sentry instrumentation required for all server functions.

## STRUCTURE

```
./
├── convex/           # Backend (schema, functions) → see convex/AGENTS.md
├── src/
│   ├── routes/       # File-based routes (auto-generates routeTree.gen.ts)
│   ├── components/   # UI components (Shadcn "base-maia" style)
│   │   └── ui/       # Base UI primitives (13 components, CVA variants)
│   ├── integrations/ # External providers (Convex + TanStack Query bridge)
│   ├── lib/          # Utilities (cn for class merging)
│   ├── router.tsx    # Router factory + client Sentry init
│   ├── env.ts        # Type-safe env (T3Env + Zod)
│   └── styles.css    # Tailwind v4 CSS-first config (OKLCH tokens)
├── docs/             # Phase docs, PRD, testing strategy
├── instrument.server.mjs  # Server-side Sentry (injected via NODE_OPTIONS)
└── vite.config.ts    # Nitro + TanStack Start + React Compiler
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Add route | `src/routes/` | File-based; dotted nesting (e.g., `auth.login.tsx`) |
| Backend logic | `convex/` | Schema in `schema.ts`, functions in separate files |
| Env vars | `src/env.ts` | T3Env; add before use, Zod validated |
| Styling | `src/styles.css` | Tailwind v4 CSS-first; OKLCH colors only |
| UI components | `src/components/ui/` | Shadcn "base-maia"; use `cn()` for class merging |
| Root layout | `src/routes/__root.tsx` | HTML shell, providers, global Header |
| Server instrumentation | `instrument.server.mjs` | Sentry/OpenTelemetry |
| Add tests | `src/**/*.test.ts` | Vitest ready; see `docs/TESTING-STRATEGY.md` |

## CODE MAP

| Symbol | Location | Role |
| --- | --- | --- |
| `getRouter` | `src/router.tsx` | Router factory + Sentry init |
| `RootDocument` | `src/routes/__root.tsx` | HTML shell, ConvexProvider wrapper |
| `AppConvexProvider` | `src/integrations/convex/provider.tsx` | Convex + TanStack Query bridge |
| `env` | `src/env.ts` | Type-safe env access (server + client) |
| `cn` | `src/lib/utils.ts` | Tailwind class merging (clsx + twMerge) |

## CONVENTIONS

- **Runtime**: `pnpm` exclusively (not npm/yarn/pnpm)
- **Path aliases**: `@/*` → `./src/*`
- **Routing**: Dotted filenames for nested routes
- **Typography**: DM Sans (`@fontsource-variable/dm-sans`)
- **Colors**: OKLCH exclusively; tokens in `src/styles.css`
- **UI primitives**: Shadcn/Base UI—never build custom modals/dropdowns/buttons
- **Styling**: Use `cn()` from `@/lib/utils` for all class merging
- **Demo files**: `demo.*` prefixed = placeholders; delete when stabilizing
- **Components**: `@base-ui/react` primitives + CVA variants + `data-slot` attributes
- **Error handling**: NeverThrow for type-safe Result pattern; avoid try/catch when possible

## ANTI-PATTERNS

| Pattern                                            | Why Forbidden                               |
| -------------------------------------------------- | ------------------------------------------- |
| Edit `routeTree.gen.ts`                            | Auto-generated; will be overwritten         |
| Edit `convex/_generated/`                          | Auto-generated                              |
| `createServerFn` without Sentry                    | Must wrap with `Sentry.startSpan`           |
| Convex indices on `_id`/`_creationTime`            | Auto-handled by Convex                      |
| Empty env strings without `emptyStringAsUndefined` | Empty string ≠ undefined                    |
| Custom UI components when Shadcn provides          | Use library primitives                      |
| Mishandled Convex `v` validators                   | Follow existing patterns strictly           |
| Direct class strings without `cn()`                | Use `cn()` for Tailwind conflict resolution |

## COMMANDS

```bash
# Dev (run both in parallel)
pnpm dev

# Build/Prod
pnpm run build
pnpm run start

# Test
pnpm run test
```

## CURRENT STATE

| Area          | Status  | Notes                              |
| ------------- | ------- | ---------------------------------- |
| Core routing  | Working | TanStack Start file-based          |
| Backend       | Working | Convex with todos example          |
| UI components | Ready   | 13 Shadcn primitives               |
| Testing       | Ready   | Vitest configured, 0 tests written |
| CI/CD         | Missing | No `.github/workflows`             |
| Auth          | Missing | No auth implementation             |

## NOTES

- ALWAYS RUN `pnpm docs:list`
- No `index.html` or `main.tsx`—TanStack Start handles entry via `__root.tsx`
- React Compiler enabled via `babel-plugin-react-compiler`
- Nitro is the server engine (configured in vite.config.ts)
- Tailwind v4 = CSS-first (no `tailwind.config.js`)
- Header has dead links to removed demo routes—cleanup pending
- Test infrastructure ready per `docs/TESTING-STRATEGY.md` but no tests exist
- After **EVERY** major change, and before **EVERY** commit, format the code, check linting, and run type-checking.

## CODING GUIDELINES

- Execute requests immediately; no fluff
- WCAG AAA accessibility
- Rendering performance awareness (repaint/reflow costs)
- Minimalism: if element has no purpose, delete it
- Library Discipline (CRITICAL): If a UI library (e.g., Shadcn UI, Radix, MUI) is detected or active in the project, **YOU MUST USE IT**.
  - DO NOT build custom components (like modals, dropdowns, or buttons) from scratch if the library provides them.
