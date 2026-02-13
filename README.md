# Realm Sync

An AI-powered creative worldbuilding platform for TTRPG masters, fiction writers, and game designers. Extract entities and facts from documents using AI, track canon consistency, and collaborate in real-time.

![Realm Sync Screnshot](/docs/screenshot.png)

## Tech Stack

- TanStack Start
- CmdK
- Tailwind CSS
- React Compiler
- [Convex](https://convex.dev)
- OpenRouter

## Key Features

- **Project Management** - Organize TTRPG campaigns, fiction, or game design projects
- **Entity & Fact Tracking** - Extract characters, locations, items, events from documents using AI
- **Relationship Charts** - Visualize entity connections and relationships in interactive graphs
- **Player Visibility Flags** - Control what lore players can see vs. DM-only secrets (TTRPG mode)
- **Canon Consistency** - Detect contradictions, timeline issues, and ambiguities
- **Real-time Collaboration** - Live updates via Convex subscriptions
- **3 Themes** - Fireside (default), Twilight (blue), Daylight (warm parchment)
- **Command Palette** - Cmd+K for quick navigation

## AI-Powered Features

All AI features are powered by [OpenRouter](https://openrouter.ai), giving you access to the best models.

- **Smart Entity Extraction** - Upload documents and let AI automatically identify characters, locations, items, events, and organizations with descriptions, aliases, and first appearances
- **Fact Mining** - AI extracts factual claims from your lore (ages, relationships, timelines, properties) and links them to the entities they describe
- **Canon Consistency Checking** - Vellum, your personal archivist, reviews new content against established canon to catch contradictions, timeline conflicts, and ambiguities before they become plot holes
- **AI Chat Assistant** - Chat with your world's lore using a friendly librarian persona that understands your canon and helps you explore your worldbuilding

## Quick Start

```bash
# Clone the repo
git clone https://github.com/aileks/realm-sync.git

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
