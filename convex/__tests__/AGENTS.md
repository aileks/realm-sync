---
read_when: writing Convex backend tests
---

# convex/**tests**/

**Scope:** Convex backend testing patterns, helpers, and conventions

## STRUCTURE

```
convex/__tests__/
├── entities/
│   ├── helpers.ts       # Shared test fixtures
│   ├── mutations.test.ts
│   └── queries.test.ts
├── lib/
│   ├── result.test.ts
│   ├── auth.test.ts
│   └── errors.test.ts
├── llm/
│   ├── cache.test.ts
│   ├── chunk.test.ts
│   └── extract.test.ts
├── alerts.test.ts
├── checks.test.ts
├── documents.test.ts
├── entityNotes.test.ts
├── entities.test.ts
├── export.test.ts
├── facts.test.ts
├── notes.test.ts
├── profile.test.ts
├── projects.test.ts
├── seed.test.ts
├── subscription.test.ts
├── tutorial.test.ts
└── users.test.ts
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Test helpers | `entities/helpers.ts` | createTestContext, setupAuthenticatedUser, setupProject |
| New backend test | Create `*.test.ts` alongside source | Use convexTest, t.withIdentity pattern |
| Test fixtures | See helpers.ts pattern | Typed builders with overrides |

## TEST PATTERN

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import convexTest from 'convex-test';
import schema from '../schema';
import { getModules } from '../..';
import { setupAuthenticatedUser, setupProject } from './entities/helpers';

describe('entities mutations', () => {
  describe('create', () => {
    let t: TestContext;
    let userId: Id<'users'>;
    let asUser: ReturnType<TestContext['withIdentity']>;
    let projectId: Id<'projects'>;

    beforeEach(async () => {
      t = convexTest(schema, getModules());
      const auth = await setupAuthenticatedUser(t);
      userId = auth.userId;
      asUser = auth.asUser;
      projectId = await setupProject(t, userId);
    });

    it('creates entity with pending status by default', async () => {
      const entityId = await asUser.mutation(api.entities.create, {
        projectId,
        name: 'Arya Stark',
        type: 'character',
      });
      const entity = await t.run(async (ctx) => ctx.db.get(entityId));
      expect(entity?.status).toBe('pending');
    });

    it('throws when not authenticated', async () => {
      await expect(
        t.mutation(api.entities.create, {
          projectId,
          name: 'Test',
          type: 'character',
        })
      ).rejects.toThrow(/unauthorized/i);
    });
  });
});
```

## CONVENTIONS

- **Test framework**: Vitest with `convex-test` library
- **Environment**: edge-runtime (configured in vitest.config.ts)
- **Test context**: `convexTest(schema, getModules())`
- **Authentication**: `t.withIdentity({ subject: userId })`
- **Isolation**: Fresh context in each `beforeEach`
- **Assertions**: `expect().rejects.toThrow()` for auth errors
- **DB access**: Direct via `t.run(async (ctx) => ctx.db.get(...))`
- **Naming**: `*.test.ts` alongside source file

## TEST HELPERS (entities/helpers.ts)

| Helper | Purpose | Pattern |
| --- | --- | --- |
| `createTestContext()` | Creates convexTest instance | `convexTest(schema, getModules())` |
| `setupAuthenticatedUser(t)` | Creates user + returns identity wrapper | Returns `{userId, asUser}` |
| `setupOtherUser(t)` | Creates secondary user (for permission tests) | Same pattern, returns different userId |
| `setupProject(t, userId, overrides)` | Creates project with optional stats/type | Overrides pattern with defaults |
| `setupProjectWithEntities(t, userId)` | Project + document + entity | Convenience helper |
| `setupEntity(t, projectId, overrides)` | Creates entity with type/name/aliases/status | Typed overrides |
| `setupFact(t, {projectId, entityId, documentId}, overrides)` | Creates fact with subject/predicate/object | All IDs required, optional overrides |
| `setupDocument(t, projectId, overrides)` | Creates document with title/content/processingStatus |  |
