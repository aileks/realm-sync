---
read_when: starting any work on this codebase
---

# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-03 **Last Updated:** See git history

Be extremely concise. Sacrifice grammar for concision.

## OVERVIEW

Full-stack React 19 app: TanStack Start (file-based routing + SSR via Nitro), Convex real-time backend, React Compiler enabled, Sentry instrumentation. Tailwind v4 CSS-first with OKLCH colors.

## STRUCTURE

```
./
├── convex/           # Backend (schema, functions) → see convex/AGENTS.md
├── src/
│   ├── routes/       # File-based routes (auto-generates routeTree.gen.ts)
│   ├── components/   # App + UI components
│   │   └── ui/       # 15 Shadcn/Base UI primitives (CVA + data-slot)
│   ├── integrations/ # Convex provider bridge
│   ├── lib/          # Utilities (cn, toId)
│   ├── test/         # Test setup
│   ├── router.tsx    # Router factory + Sentry init
│   ├── env.ts        # T3Env + Zod validated env
│   └── styles.css    # Tailwind v4 CSS-first (OKLCH tokens)
├── docs/             # Phase docs, PRD, specs
├── scripts/          # docs.mjs for docs:list
├── instrument.server.mjs  # Server Sentry (NODE_OPTIONS injection)
└── vite.config.ts    # Nitro + TanStack Start + React Compiler
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Add route | `src/routes/` | File-based; dotted nesting (`projects.$projectId.tsx`) |
| Backend logic | `convex/` | Schema: `schema.ts`; functions: separate files |
| Env vars | `src/env.ts` | T3Env; add to schema before use |
| Styling | `src/styles.css` | Tailwind v4 CSS-first; OKLCH only |
| UI components | `src/components/ui/` | Shadcn/Base UI; use `cn()` always |
| Root layout | `src/routes/__root.tsx` | HTML shell, providers, no index.html |
| Server instrumentation | `instrument.server.mjs` | Sentry/OpenTelemetry |
| Tests | `*.test.ts` alongside source | Vitest; `convex-test` for backend |
| Auth helpers | `convex/lib/auth.ts` | getAuthUserId, requireAuth, getCurrentUser |

## CODE MAP

| Symbol | Location | Role |
| --- | --- | --- |
| `getRouter` | `src/router.tsx` | Router factory + Sentry client init |
| `RootDocument` | `src/routes/__root.tsx` | HTML shell component |
| `Route` | `src/routes/__root.tsx` | Root route with head/meta |
| `AppConvexProvider` | `src/integrations/convex/provider.tsx` | ConvexAuthProvider wrapper |
| `env` | `src/env.ts` | Type-safe env (server: SERVER*URL; client: VITE*\*) |
| `cn` | `src/lib/utils.ts` | Tailwind class merging (clsx + twMerge) |
| `toId` | `src/lib/utils.ts` | Type-safe Convex ID conversion |

## CONVENTIONS

- **Types**: Use types over interfaces unless an interface is explicitly need; use a comment for explanation/justification
- **Runtime**: `pnpm` exclusively
- **Linter**: Oxlint (not ESLint) - oxc parser, error-level rules block `as any` and `@ts-ignore`
- **Path aliases**: `@/*` → `./src/*` (but Convex uses relative `../../convex/_generated/api`)
- **Routing**: Underscore-escaped filenames for nested routes (`projects_.$projectId_.documents.tsx` → `/projects/:projectId/documents`); `_.` escapes prevent folder nesting
- **Typography**: DM Sans (body), Aleo (headings), iA Writer Mono (code)
- **Colors**: OKLCH exclusively; 3 themes: default, twilight-study, amber-archive
- **UI primitives**: @base-ui/react + CVA variants + `data-slot` attributes
- **Styling**: Always use `cn()` for Tailwind conflict resolution
- **Components**: Named exports only; no default exports in ui/
- **Error handling**: NeverThrow for Result pattern; avoid try/catch
- **Server functions**: Wrap with `Sentry.startSpan({ name: '...' }, async () => {...})`
- **Build**: `vite build && cp instrument.server.mjs .output/server`

## ANTI-PATTERNS

| Pattern                          | Why Forbidden                               |
| -------------------------------- | ------------------------------------------- |
| Edit `routeTree.gen.ts`          | Auto-generated; overwritten on route change |
| Edit `convex/_generated/`        | Auto-generated                              |
| `createServerFn` without Sentry  | Must wrap with `Sentry.startSpan`           |
| Custom UI when Shadcn provides   | Use 15 existing primitives                  |
| Direct class strings             | Use `cn()` for Tailwind conflict resolution |
| `as any`, `@ts-ignore`           | Error-level lint rule (Oxlint)              |
| `@ts-expect-error`               | Prefer proper types over silencing errors   |
| Empty catch blocks               | Oxlint blocks these                         |
| Silent failures                  | Throw explicit errors                       |
| npm/yarn                         | pnpm only (frozen lockfile in CI)           |
| index.html or main.tsx           | TanStack Start handles entry                |
| Indices on `_id`/`_creationTime` | Convex auto-handles                         |
| `getAuthUserId` in mutations     | Use `requireAuth` instead                   |
| Validation in handler (not args) | Use `v` validators in Convex args           |

## COMMANDS

```bash
pnpm dev              # Dev server (port 3000, Sentry injected)
pnpm run build        # Production build
pnpm run start        # Production server
pnpm test             # Vitest (94 tests)
pnpm run lint         # Oxlint with --fix, --type-aware
pnpm run typecheck    # tsc --noEmit
pnpm run format       # Prettier (with Tailwind plugin)
pnpm docs:list        # List docs with front-matter check
```

## CI/CD

4 parallel jobs (Ubuntu latest, Node.js 20):

1. **Lint** - oxlint --fix
2. **Type Check** - tsc --noEmit
3. **Test** - vitest run
4. **Build** - vite build

## CURRENT STATE

| Area          | Status  | Notes                                         |
| ------------- | ------- | --------------------------------------------- |
| Core routing  | Working | TanStack Start file-based + SSR               |
| Backend       | Working | Convex schema, auth, CRUD                     |
| UI components | Ready   | 15 Shadcn/Base UI primitives                  |
| Testing       | Working | Vitest + convex-test, 94 passing              |
| CI/CD         | Working | 4 parallel jobs: lint, typecheck, test, build |
| Auth          | Working | Google OAuth + Password                       |
| Themes        | Ready   | 3 OKLCH themes in styles.css                  |

## TECH STACK

| Layer      | Technology                | Version |
| ---------- | ------------------------- | ------- |
| Framework  | TanStack Start            | 1.132.0 |
| UI         | React 19 + React Compiler | 19.2.0  |
| Styling    | Tailwind v4 CSS-first     | 4.0.6   |
| Backend    | Convex                    | 1.27.3  |
| Auth       | @convex-dev/auth          | 0.0.90  |
| SSR        | Nitro                     | latest  |
| Monitoring | Sentry                    | 10.22.0 |
| Testing    | Vitest + convex-test      | 3.0.5   |
| Linting    | Oxlint                    | 1.36.0  |

## NOTES

- **ALWAYS RUN `pnpm docs:list` FIRST**
- No `index.html`—TanStack Start generates HTML via `__root.tsx`
- React Compiler enabled: no manual memoization needed
- Tailwind v4 = CSS-first (no `tailwind.config.js`)
- Router uses factory pattern (`getRouter()`) for Sentry integration
- Server instrumentation via NODE_OPTIONS `--import` flag
- Entity colors defined: character (red), location (green), item (gold), concept (purple), event (blue)
- Before commits: `pnpm run format && pnpm run lint && pnpm run typecheck`
- Follow TDD when implementing new features
