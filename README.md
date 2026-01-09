# Realm Sync

A full-stack creative worldbuilding platform for TTRPG masters, fiction writers, and game designers. Extract entities and facts from documents using AI, track canon consistency, and collaborate in real-time.

![Realm Sync Screnshot](/docs/screenshot.png)

## Tech Stack

- TanStack Start
- CmdK
- Tailwind CSS
- React Compiler
- [Convex](https://convex.dev)

## Key Features

- **Project Management** - Organize TTRPG campaigns, fiction, or game design projects
- **Entity & Fact Tracking** - Extract characters, locations, items, events from documents using AI
- **Canon Consistency** - Detect contradictions, timeline issues, and ambiguities
- **Real-time Collaboration** - Live updates via Convex subscriptions
- **AI Chat** - Streaming conversations with Vellum integration
- **3 Themes** - Fireside (default), Twilight (blue), Daylight (warm parchment)
- **Command Palette** - Cmd+K for quick navigation

## Quick Start

```bash
# clone the repo
git clone https://github.com/tanstack/realm-sync.git

# Install dependencies
cd realm-sync && pnpm install

# Start development server (port 3000)
pnpm dev
```

## Local Development

Requirements:

- [Node.js](https://nodejs.org/en/download/) (v22 or later)
- [pnpm](https://pnpm.io/installation)

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
