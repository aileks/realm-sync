# Realm Sync

A full-stack creative worldbuilding platform for TTRPG masters, fiction writers, and game designers. Extract entities and facts from documents using AI, track canon consistency, and collaborate in real-time.

## Tech Stack

- TanStack Start
- CmdK
- Tailwind CSS
- React Compiler
- [Convex](https://convex.dev)

## Key Features

- **Project Management** — Organize TTRPG campaigns, fiction, or game design projects
- **Entity & Fact Tracking** — Extract characters, locations, items, events from documents using AI
- **Canon Consistency** — Detect contradictions, timeline issues, and ambiguities
- **Real-time Collaboration** — Live updates via Convex subscriptions
- **AI Chat** — Streaming conversations with Vellum integration
- **3 Themes** — Fireside (default), Twilight (blue), Daylight (warm parchment)
- **Command Palette** — Cmd+K for quick navigation

## Run Locally

```bash
# Install dependencies
pnpm install

# Start development server (port 3000)
pnpm dev

# Production build
pnpm run build

# Run tests
pnpm test

# Lint with oxlint
pnpm run lint

# TypeScript check
pnpm run typecheck
```

## Project Structure

```
├── convex/           # Backend (schema, functions, auth)
├── src/
│   ├── routes/       # TanStack Start file-based routing
│   ├── components/   # React components + UI primitives
│   ├── integrations/ # Convex provider bridge
│   └── styles.css    # Tailwind v4 CSS-first
├── vite.config.ts    # Vite + Nitro + React Compiler
└── instrument.server.mjs  # Sentry server instrumentation
```

## Commands

| Command              | Description                       |
| -------------------- | --------------------------------- |
| `pnpm dev`           | Dev server with auto-reload       |
| `pnpm run build`     | Production build                  |
| `pnpm run start`     | Run production server             |
| `pnpm test`          | Vitest run (265 tests)            |
| `pnpm run lint`      | Oxlint with auto-fix              |
| `pnpm run typecheck` | TypeScript no-emit check          |
| `pnpm docs:list`     | List docs with front-matter check |
