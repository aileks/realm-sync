---
read_when: working on Convex backend (database, functions, auth)
---

# convex/

**Scope:** Real-time backend—database, server functions, subscriptions

## STRUCTURE

```
convex/
├── _generated/      # Auto-generated types (NEVER EDIT)
├── __tests__/       # Test files (convex-test) - 13 test files
├── lib/             # Auth, errors, Result pattern → see convex/lib/AGENTS.md
├── llm/             # Extraction pipeline → see convex/llm/AGENTS.md
├── auth.config.ts   # Auth provider configuration
├── auth.ts          # Convex Auth setup (Google + Password)
├── documents.ts     # Document CRUD
├── entities.ts      # Entity CRUD + merge + timeline (844 lines)
├── facts.ts         # Fact CRUD + confirm/reject
├── chat.ts          # Vellum streaming chat
├── chatHistory.ts   # Chat message persistence
├── http.ts          # HTTP router
├── cleanup.ts       # Scheduled cleanup
├── crons.ts         # Cron jobs
├── projects.ts      # Project CRUD
├── schema.ts        # Table definitions
├── seed.ts          # Demo data seeding (811 lines)
├── storage.ts       # File upload/download
├── tutorial.ts      # Tutorial seeding
├── users.ts         # User query
└── tsconfig.json    # Convex TS config
```

## WHERE TO LOOK

| Task            | Location                 | Notes                        |
| --------------- | ------------------------ | ---------------------------- |
| Define tables   | `schema.ts`              | Use `v` validators           |
| Write functions | `*.ts` (not \_generated) | Named exports                |
| Auth helpers    | `lib/auth.ts`            | 4 auth functions             |
| Error handling  | `lib/errors.ts`          | 5 error types                |
| Result pattern  | `lib/result.ts`          | unwrapOrThrow, safeJsonParse |
| LLM operations  | `llm/`                   | Chunk, cache, extract        |
| Tests           | `__tests__/*.test.ts`    | convex-test                  |
| Auth details    | `lib/AGENTS.md`          | Auth + error + Result        |
| LLM details     | `llm/AGENTS.md`          | Chunking, caching            |

## SCHEMA

| Table | Key Fields | Notes |
| --- | --- | --- |
| `users` | name, email, settings | Extended Convex Auth |
| `projects` | userId, name, stats, isTutorial, projectType | User-owned, type required |
| `documents` | projectId, title, content, processingStatus | Document storage |
| `entities` | projectId, name, type, aliases, status, revealedToViewers | Canon + TTRPG reveal |
| `facts` | projectId, entityId, subject, predicate, object, status | Canon (pending/confirmed/rejected) |
| `alerts` | projectId, type, severity, status | Continuity (open/resolved/dismissed) |
| `chatMessages` | userId, role, content | Vellum history |
| `llmCache` | inputHash, promptVersion, response | 7-day TTL |

## CONVENTIONS

- Named exports: `export const funcName = query(...)`
- `v` validators in args
- Proper indexes for queries
- `ctx.db.get()` + `ctx.db.patch()` for updates
- Queries: null/empty for auth failures
- Mutations: throw for auth failures
- `unwrapOrThrow()` for Result unwrapping

## ANTI-PATTERNS

| Pattern                          | Why                                |
| -------------------------------- | ---------------------------------- |
| Indices on `_id`/`_creationTime` | Auto-handled                       |
| Validation in handler            | Use `v` in args                    |
| Edit `_generated/*`              | Overwritten                        |
| Silent failures                  | Throw errors                       |
| `getAuthUserId` in mutations     | Use `requireAuth`                  |
| Manual try/catch                 | Use Result pattern                 |
| Throw in queries                 | Return null/empty                  |
| Direct LLM calls without cache   | Use `checkCache()`/`saveToCache()` |

## COMMANDS

```bash
npx convex dev           # Start dev server (auto-reloads)
npx convex deploy        # Deploy to production
```

## NOTES

- Schema changes may prompt migration
- Real-time via Convex hooks (useQuery)
- Functions auto-reload during dev
- 265 tests passing
- Cascade deletes: manual before project
- Stats sync: every CRUD patches project.stats
- entities.ts (844 lines) largest
- LLM caching: 7-day TTL, SHA-256
- See `lib/AGENTS.md` for auth + error + Result
- See `llm/AGENTS.md` for chunking + caching
