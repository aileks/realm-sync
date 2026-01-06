---
summary: Technical specification for the Realm Sync project.
read_when: starting any work on this codebase
---

# Realm Sync - Technical Specification

## Technical Stack

| Component | Technology | Version | Purpose |
| --- | --- | --- | --- |
| **Framework** | TanStack Start | ^1.132.0 | React 19 + SSR via Nitro |
| **Runtime** | pnpm | latest | Package manager |
| **Backend** | Convex | ^1.27.3 | Database, Functions, Auth, Storage |
| **LLM Provider** | OpenRouter | latest | `tngtech/deepseek-r1t2-chimera:free` |
| **Error Handling** | NeverThrow | latest | Type-safe Result pattern |
| **Styling** | Tailwind CSS | ^4.0.6 | CSS-first, OKLCH colors |
| **UI Components** | Shadcn / Base UI | latest | 17 primitives |
| **Monitoring** | Sentry | ^10.22.0 | Error tracking + instrumentation |
| **Fonts** | Fontsource | latest | DM Sans, Aleo Variable, iA Writer Mono |
| **State** | TanStack Query | ^1.0.0 | React Query for data fetching |
| **Form State** | TanStack Form | ^1.0.0 | Form management |
| **Router** | TanStack Router | ^1.132.0 | File-based routing |
| **Validation** | Zod | ^4.1.11 | Runtime validation |
| **Testing** | Vitest | ^3.2.4 | Unit + integration tests |
| **Markdown** | marked | ^17.0.1 | Markdown rendering |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (React 19)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │  TanStack   │  │   Shadcn     │  │  Sentry  │ │
│  │   Router    │  │   Components  │  │  Client  │ │
│  └──────┬──────┘  └──────┬───────┘  └──────────┘ │
│         │                 │                              │
│         │  ┌─────────────▼──────────────┐           │
│         └──▶│  @convex-dev/react-query  │◀──────────┘
│            └──────────┬───────────────────┘
└───────────────────────┼───────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Convex Backend                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │  Database    │  │  Functions   │  │  Auth    │ │
│  │  (Real-time) │  │  (Queries/   │  │  (OAuth) │ │
│  │              │  │   Mutations) │  │          │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────┘ │
│         │                  │                              │
│         │           ┌──────▼──────────┐                │
│         └──────────▶│  Actions (LLM) │                │
│                    └──────┬──────────┘                │
│                           │                           │
│                           ▼                           │
│              ┌─────────────────────┐                    │
│              │    OpenRouter     │                    │
│              │ (Vellum Persona)  │                    │
│              └─────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Schema Definition File

`convex/schema.ts`

### Table: `users`

Extended from Convex Auth (custom fields merged automatically).

| Field | Type | Description | Validation |
| --- | --- | --- | --- |
| `name` | optional string | User's display name | `v.optional(v.string())` |
| `email` | optional string | User's email address (unique) | `v.optional(v.string())` |
| `image` | optional string | URL to user's avatar | `v.optional(v.string())` |
| `createdAt` | number | Unix timestamp of account creation | `v.number()` |
| `onboardingCompleted` | optional boolean | Onboarding completion flag | `v.optional(v.boolean())` |
| `tutorialState` | optional object | Tour state (seen, steps, timestamps) | `v.optional(v.object({...}))` |
| `settings` | optional object | Theme and notification preferences | `v.optional(v.object({...}))` |

**Indexes**:

- `by_email`: `["email"]` (unique lookup for auth)

---

### Table: `projects`

| Field | Type | Description | Validation |
| --- | --- | --- | --- |
| `userId` | id("users") | Reference to the owner | `v.id("users")` |
| `name` | string | Name of the world or campaign | `v.string()` |
| `description` | optional string | Brief overview of the project | `v.optional(v.string())` |
| `createdAt` | number | Creation timestamp | `v.number()` |
| `updatedAt` | number | Last modification timestamp | `v.number()` |
| `isTutorial` | optional boolean | Marks demo/tutorial projects | `v.optional(v.boolean())` |
| `stats` | optional object | Cached counts for docs, entities, facts, alerts | `v.optional(v.object({...}))` |

**Stats Object Structure**:

```typescript
{
  documentCount: number,
  noteCount: number,
  entityCount: number,
  factCount: number,
  alertCount: number
}
```

**Indexes**:

- `by_user`: `["userId", "updatedAt"]` (ordered listing for user's projects)

---

### Table: `documents`

| Field | Type | Description | Validation |
| --- | --- | --- | --- |
| `projectId` | id("projects") | Parent project reference | `v.id("projects")` |
| `title` | string | Title of the document | `v.string()` |
| `content` | optional string | Inline text content (limit: 1MB) | `v.optional(v.string())` |
| `storageId` | optional id("\_storage") | Optional reference to Convex Storage | `v.optional(v.id("_storage"))` |
| `contentType` | union | "text" \| "markdown" \| "file" | `v.union(v.literal("text"), v.literal("markdown"), v.literal("file"))` |
| `orderIndex` | number | Sequence within the project | `v.number()` |
| `wordCount` | number | Total word count for the document | `v.number()` |
| `createdAt` | number | Creation timestamp | `v.number()` |
| `updatedAt` | number | Last edit timestamp | `v.number()` |
| `processedAt` | optional number | Timestamp of last extraction | `v.optional(v.number())` |
| `processingStatus` | union | "pending" \| "processing" \| "completed" \| "failed" | `v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed"))` |

**Indexes**:

- `by_project`: `["projectId", "orderIndex"]` (ordered list within project)
- `by_project_status`: `["projectId", "processingStatus"]` (filter for processing queue)

**Search Indexes**:

- `search_content`: `searchField: content`, `filterFields: [projectId]`

**Constraints**:

- Inline `content` limited to 1MB. For larger files, use `storageId`.

---

### Table: `entities`

| Field | Type | Description | Validation |
| --- | --- | --- | --- |
| `projectId` | id("projects") | Project reference | `v.id("projects")` |
| `name` | string | Unique name within the project | `v.string()` |
| `type` | union | "character" \| "location" \| "item" \| "concept" \| "event" | `v.union(v.literal("character"), v.literal("location"), v.literal("item"), v.literal("concept"), v.literal("event"))` |
| `description` | optional string | Summary of the entity | `v.optional(v.string())` |
| `aliases` | array | Alternate names (nicknames, titles) | `v.array(v.string())` |
| `firstMentionedIn` | optional id("documents") | Reference to first discovery document | `v.optional(v.id("documents"))` |
| `createdAt` | number | Creation timestamp | `v.number()` |
| `updatedAt` | number | Last update timestamp | `v.number()` |

**Indexes**:

- `by_project`: `["projectId", "type"]` (list entities by type)
- `by_name`: `["projectId", "name"]` (unique name lookup within project)

**Search Indexes**:

- `search_name`: `searchField: name`, `filterFields: [projectId]`

---

### Table: `facts`

| Field | Type | Description | Validation |
| --- | --- | --- | --- |
| `projectId` | id("projects") | Project reference | `v.id("projects")` |
| `entityId` | id("entities") | Subject entity reference | `v.id("entities")` |
| `documentId` | id("documents") | Source document reference | `v.id("documents")` |
| `subject` | string | The entity name or specific aspect | `v.string()` |
| `predicate` | string | Relationship type or attribute | `v.string()` |
| `object` | string | The value or target | `v.string()` |
| `confidence` | number | Extraction confidence (0.0 to 1.0) | `v.number()` |
| `evidenceSnippet` | string | Direct quote from document | `v.string()` |
| `evidencePosition` | optional object | Start/end character offsets | `v.optional(v.object({ start: v.number(), end: v.number() }))` |
| `temporalBound` | optional object | Time metadata | `v.optional(v.object({ type: v.union(...), value: v.string() }))` |
| `status` | union | "pending" \| "confirmed" \| "rejected" | `v.union(v.literal("pending"), v.literal("confirmed"), v.literal("rejected"))` |
| `createdAt` | number | Extraction timestamp | `v.number()` |

**temporalBound Object Structure**:

```typescript
{
  type: "point" | "range" | "relative",
  value: string
}
```

**Indexes**:

- `by_entity`: `["entityId", "status"]` (facts for an entity, filtered by status)
- `by_document`: `["documentId"]` (facts extracted from a doc)
- `by_project`: `["projectId", "status"]` (all project facts, filtered by status)

---

### Table: `alerts`

| Field | Type | Description | Validation |
| --- | --- | --- | --- |
| `projectId` | id("projects") | Project reference | `v.id("projects")` |
| `documentId` | id("documents") | Document that triggered the alert | `v.id("documents")` |
| `factIds` | array | References to conflicting facts | `v.array(v.id("facts"))` |
| `entityIds` | array | Affected entities | `v.array(v.id("entities"))` |
| `type` | union | "contradiction" \| "timeline" \| "ambiguity" | `v.union(v.literal("contradiction"), v.literal("timeline"), v.literal("ambiguity"))` |
| `severity` | union | "error" \| "warning" | `v.union(v.literal("error"), v.literal("warning"))` |
| `title` | string | Short summary of the issue | `v.string()`` |
| `description` | string | Detailed explanation | `v.string()` |
| `evidence` | array | List of { snippet, documentId, documentTitle } | `v.array(v.object({ snippet: v.string(), documentId: v.id("documents"), documentTitle: v.string() }))` |
| `suggestedFix` | optional string | Potential resolution steps | `v.optional(v.string())` |
| `status` | union | "open" \| "resolved" \| "dismissed" | `v.union(v.literal("open"), v.literal("resolved"), v.literal("dismissed"))` |
| `resolutionNotes` | optional string | Notes from user | `v.optional(v.string())` |
| `createdAt` | number | Detection timestamp | `v.number()` |
| `resolvedAt` | optional number | Resolution timestamp | `v.optional(v.number())` |

**Indexes**:

- `by_project`: `["projectId", "status"]` (active alerts)
- `by_document`: `["documentId"]` (alerts triggered by a doc)

---

### Table: `notes`

| Field | Type | Description | Validation |
| --- | --- | --- | --- |
| `projectId` | id("projects") | Parent project reference | `v.id("projects")` |
| `title` | string | Note title | `v.string()` |
| `content` | string | Note content (rich text or markdown) | `v.string()` |
| `contentType` | union | "text" \| "markdown" | `v.union(v.literal("text"), v.literal("markdown"))` |
| `tags` | array | Optional tags for organization | `v.array(v.string())` |
| `pinned` | boolean | Whether note is pinned to top | `v.boolean()` |
| `createdAt` | number | Creation timestamp | `v.number()` |
| `updatedAt` | number | Last edit timestamp | `v.number()` |

**Indexes**:

- `by_project`: `["projectId", "pinned", "updatedAt"]` (Ordered list with pinned first)

**Search Indexes**:

- `search_content`: `searchField: content`, `filterFields: [projectId]`

---

### Table: `llmCache`

| Field | Type | Description | Validation |
| --- | --- | --- | --- |
| `inputHash` | string | SHA-256 hash of input + prompt version | `v.string()` |
| `promptVersion` | string | Version identifier for extraction prompt | `v.string()` |
| `modelId` | string | LLM model used | `v.string()` |
| `response` | string | Stringified JSON of response | `v.string()` |
| `tokenCount` | optional number | Estimated tokens used | `v.optional(v.number())` |
| `createdAt` | number | Cache entry timestamp | `v.number()` |
| `expiresAt` | number | TTL expiration timestamp | `v.number()` |

**Indexes**:

- `by_hash`: `["inputHash", "promptVersion"]` (cache lookup)

**Constraints**:

- TTL: 7 days (configurable via prompt version bump)

---

### Table: `chatMessages`

| Field | Type | Description | Validation |
| --- | --- | --- | --- |
| `userId` | id("users") | Reference to the user | `v.id("users")` |
| `role` | union | "user" \| "assistant" | `v.union(v.literal("user"), v.literal("assistant"))` |
| `content` | string | Message content | `v.string()` |
| `createdAt` | number | Message timestamp | `v.number()` |

**Indexes**:

- `by_user`: `["userId", "createdAt"]` (ordered message history per user)

---

## API Specifications

### Phase 1: Foundation Functions

#### File: `convex/projects.ts`

```typescript
export const list = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query('projects')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
  },
});

export const get = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    return await ctx.db.get(projectId);
  },
});

export const create = mutation({
  args: {
    userId: v.id('users'),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('projects', {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stats: {
        documentCount: 0,
        noteCount: 0,
        entityCount: 0,
        factCount: 0,
        alertCount: 0,
      },
    });
  },
});

export const update = mutation({
  args: {
    projectId: v.id('projects'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { projectId, ...updates }) => {
    return await ctx.db.patch(projectId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    // Cascade delete: documents, entities, facts, alerts
    const documents = await ctx.db
      .query('documents')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect();

    for (const doc of documents) {
      await ctx.db.delete(doc._id);
    }

    // Delete entities, facts, alerts similarly...
    return await ctx.db.delete(projectId);
  },
});
```

#### File: `convex/documents.ts`

```typescript
export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    return await ctx.db
      .query('documents')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .order('asc')
      .collect();
  },
});

export const get = query({
  args: { documentId: v.id('documents') },
  handler: async (ctx, { documentId }) => {
    return await ctx.db.get(documentId);
  },
});

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    title: v.string(),
    content: v.optional(v.string()),
    contentType: v.union(
      v.literal('text'),
      v.literal('markdown'),
      v.literal('file')
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('documents')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();

    const orderIndex = existing.length;

    const wordCount = args.content ? args.content.split(/\s+/).length : 0;

    return await ctx.db.insert('documents', {
      ...args,
      orderIndex,
      wordCount,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      processingStatus: 'pending',
    });
  },
});

export const update = mutation({
  args: {
    documentId: v.id('documents'),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, { documentId, ...updates }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc) throw new Error('Document not found');

    const wordCount =
      updates.content ? updates.content.split(/\s+/).length : doc.wordCount;

    return await ctx.db.patch(documentId, {
      ...updates,
      wordCount,
      updatedAt: Date.now(),
      processingStatus: 'pending',
    });
  },
});

export const reorder = mutation({
  args: {
    projectId: v.id('projects'),
    documentIds: v.array(v.id('documents')),
  },
  handler: async (ctx, { projectId, documentIds }) => {
    for (let i = 0; i < documentIds.length; i++) {
      await ctx.db.patch(documentIds[i], { orderIndex: i });
    }
  },
});
```

#### File: `convex/storage.ts`

```typescript
export const generateUploadUrl = action({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getFileUrl = action({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});
```

---

#### File: `convex/notes.ts`

```typescript
export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    return await ctx.db
      .query('notes')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect();
  },
});

export const get = query({
  args: { noteId: v.id('notes') },
  handler: async (ctx, { noteId }) => {
    return await ctx.db.get(noteId);
  },
});

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    title: v.string(),
    content: v.string(),
    contentType: v.union(v.literal('text'), v.literal('markdown')),
    tags: v.optional(v.array(v.string())),
    pinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('notes', {
      ...args,
      pinned: args.pinned ?? false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    noteId: v.id('notes'),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    pinned: v.optional(v.boolean()),
  },
  handler: async (ctx, { noteId, ...updates }) => {
    return await ctx.db.patch(noteId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { noteId: v.id('notes') },
  handler: async (ctx, { noteId }) => {
    return await ctx.db.delete(noteId);
  },
});

export const togglePin = mutation({
  args: { noteId: v.id('notes') },
  handler: async (ctx, { noteId }) => {
    const note = await ctx.db.get(noteId);
    if (!note) throw new Error('Note not found');
    return await ctx.db.patch(noteId, {
      pinned: !note.pinned,
      updatedAt: Date.now(),
    });
  },
});
```

---

### Phase 2: Extraction Functions

#### File: `convex/llm/extract.ts`

```typescript
export const extractFromDocument = internalAction({
  args: { documentId: v.id('documents') },
  handler: async (ctx, { documentId }) => {
    // 1. Get document content
    const doc = await ctx.runQuery(api.documents.get, { id: documentId });
    if (!doc || !doc.content) throw new Error('Document not found or empty');

    // 2. Check cache
    const contentHash = await computeHash(doc.content);
    const cached = await ctx.runQuery(internal.llm.cache.checkCache, {
      hash: contentHash,
      promptVersion: 'v1',
    });

    if (cached) {
      await ctx.runMutation(internal.llm.extract.processExtractionResult, {
        documentId,
        result: cached.response,
      });
      return;
    }

    // 3. Chunk document if > 3,000 tokens
    const chunks = chunkDocument(doc.content, 3000, 200);

    // 4. Call OpenRouter
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://realmsync.app',
          'X-Title': 'Realm Sync',
        },
        body: JSON.stringify({
          model: 'tngtech/deepseek-r1t2-chimera:free',
          messages: [
            { role: 'system', content: Vellum_SYSTEM_PROMPT },
            { role: 'user', content: chunks[0] },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'canon_extraction',
              strict: true,
              schema: EXTRACTION_SCHEMA,
            },
          },
        }),
      }
    );

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    // 5. Cache result
    await ctx.runMutation(internal.llm.cache.saveToCache, {
      hash: contentHash,
      promptVersion: 'v1',
      modelId: 'tngtech/deepseek-r1t2-chimera:free',
      response: result,
    });

    // 6. Save entities/facts
    await ctx.runMutation(internal.llm.extract.processExtractionResult, {
      documentId,
      result,
    });
  },
});

const Vellum_SYSTEM_PROMPT = `You are Vellum, the Archivist Moth — a meticulous librarian who catalogs fictional worlds.

PRINCIPLES:
- Only extract what is EXPLICITLY stated in the text.
- Always cite the exact evidence (quote the relevant passage).
- Assign confidence scores: 1.0 for explicit statements, 0.7-0.9 for strong implications, 0.5-0.6 for weak implications.
- Never invent or assume facts not present in the text.
- Identify entity types: character, location, item, concept, event.
- Extract relationships between entities.
- Note temporal information when present.

OUTPUT: Return structured JSON matching the provided schema.`;
```

#### Extraction JSON Schema

```typescript
const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    entities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { enum: ['character', 'location', 'item', 'concept', 'event'] },
          description: { type: 'string' },
          aliases: { type: 'array', items: { type: 'string' } },
        },
        required: ['name', 'type'],
        additionalProperties: false,
      },
    },
    facts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          entityName: { type: 'string' },
          subject: { type: 'string' },
          predicate: { type: 'string' },
          object: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          evidence: { type: 'string' },
          temporalBound: {
            type: 'object',
            properties: {
              type: { enum: ['point', 'range', 'relative'] },
              value: { type: 'string' },
            },
          },
        },
        required: [
          'entityName',
          'subject',
          'predicate',
          'object',
          'confidence',
          'evidence',
        ],
        additionalProperties: false,
      },
    },
    relationships: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sourceEntity: { type: 'string' },
          targetEntity: { type: 'string' },
          relationshipType: { type: 'string' },
          evidence: { type: 'string' },
        },
        required: [
          'sourceEntity',
          'targetEntity',
          'relationshipType',
          'evidence',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['entities', 'facts', 'relationships'],
  additionalProperties: false,
};
```

---

### Phase 4: Continuity Functions

#### File: `convex/checks.ts`

```typescript
export const runCheck = internalAction({
  args: { documentId: v.id('documents') },
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.runQuery(api.documents.get, { id: documentId });
    if (!doc) throw new Error('Document not found');

    // 1. Gather relevant canon
    const entities = await ctx.runQuery(api.entities.listByProject, {
      projectId: doc.projectId,
    });

    const canonContext = entities.map((e) => ({
      name: e.name,
      type: e.type,
      facts: [], // Populate with existing facts
    }));

    // 2. Build context window
    const context = JSON.stringify({
      entities: canonContext,
      newDocument: doc.content,
    });

    // 3. Call LLM with check prompt
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tngtech/deepseek-r1t2-chimera:free',
          messages: [
            { role: 'system', content: CHECK_SYSTEM_PROMPT },
            { role: 'user', content: context },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'continuity_check',
              strict: true,
              schema: CHECK_SCHEMA,
            },
          },
        }),
      }
    );

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    // 4. Create alerts
    await ctx.runMutation(internal.checks.createAlerts, {
      projectId: doc.projectId,
      documentId,
      alerts: result.alerts,
    });
  },
});
```

#### Check JSON Schema

```typescript
const CHECK_SCHEMA = {
  type: 'object',
  properties: {
    alerts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { enum: ['contradiction', 'timeline', 'ambiguity'] },
          severity: { enum: ['error', 'warning'] },
          title: { type: 'string' },
          description: { type: 'string' },
          evidence: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                source: { enum: ['canon', 'new_document'] },
                quote: { type: 'string' },
              },
            },
          },
          suggestedFix: { type: 'string' },
          affectedEntities: { type: 'array', items: { type: 'string' } },
        },
        required: ['type', 'severity', 'title', 'description', 'evidence'],
        additionalProperties: false,
      },
    },
    summary: {
      type: 'object',
      properties: {
        totalIssues: { type: 'number' },
        errors: { type: 'number' },
        warnings: { type: 'number' },
        checkedEntities: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  required: ['alerts', 'summary'],
  additionalProperties: false,
};
```

---

## File Structure

```
realm-sync/
├── convex/
│   ├── _generated/              # Auto-generated types (NEVER EDIT)
│   ├── AGENTS.md               # Convex-specific conventions
│   ├── schema.ts               # Database schema definition
│   ├── auth.ts                # Convex Auth configuration
│   ├── projects.ts             # Project CRUD functions
│   ├── documents.ts            # Document CRUD functions
│   ├── notes.ts               # Notes CRUD functions
│   ├── entities.ts             # Entity management functions
│   ├── facts.ts               # Fact management functions
│   ├── alerts.ts              # Alert management functions
│   ├── storage.ts             # Convex Storage functions
│   ├── export.ts              # Export functionality
│   └── llm/
│       ├── extract.ts          # Extraction pipeline (action)
│       ├── cache.ts           # LLM cache management
│       └── checks.ts          # Continuity checking
├── src/
│   ├── components/
│   │   ├── ui/               # Shadcn primitives (13 components)
│   │   ├── Header.tsx         # Global navigation
│   │   └── (Phase-specific components...)
│   ├── integrations/
│   │   └── convex/
│   │       └── provider.tsx   # Convex + TanStack Query bridge
│   ├── lib/
│   │   └── utils.ts          # Utility functions (cn for class merging)
│   ├── routes/
│   │   ├── __root.tsx        # HTML shell, providers, layout
│   │   ├── index.tsx         # Dashboard
│   │   ├── auth/
│   │   │   └── index.tsx    # Sign in/up
│   │   └── projects/
│   │       ├── index.tsx      # Project list
│   │       ├── new.tsx        # Create project
│   │       └── $projectId/
│   │           ├── index.tsx   # Project dashboard
│   │           ├── documents/
│   │           │   ├── index.tsx
│   │           │   ├── new.tsx
│   │           │   └── $documentId.tsx
│   │           ├── notes/
│   │           │   ├── index.tsx
│   │           │   ├── new.tsx
│   │           │   └── $noteId.tsx
│   │           ├── canon/
│   │           │   ├── index.tsx
│   │           │   ├── search.tsx
│   │           │   ├── entities/
│   │           │   │   └── $entityId.tsx
│   │           │   └── timeline.tsx
│   │           └── alerts/
│   │               └── index.tsx
│   ├── env.ts                  # Type-safe environment variables
│   ├── router.tsx              # Router factory + Sentry init
│   └── styles.css              # Tailwind v4, OKLCH tokens
├── docs/
│   ├── PRD.md                 # Product Requirements Document
│   ├── SCHEMA.md              # Detailed Schema Reference
│   ├── TESTING-STRATEGY.md     # Testing Approach
│   ├── UI-DESIGN.md           # Visual Design System
│   └── PHASE-*.md            # Implementation Phase Details
├── instrument.server.mjs        # Server-side Sentry instrumentation
├── package.json
├── vite.config.ts
├── tsconfig.json
└── SPEC.md                   # This file
```

---

## Design System Implementation

### CSS Variables (`src/styles.css`)

#### Root Theme

```css
:root {
  /* Base Colors */
  --background: oklch(0.13 0.015 70);
  --foreground: oklch(0.88 0.02 75);
  --card: oklch(0.16 0.015 70);
  --primary: oklch(0.7 0.06 70);
  --secondary: oklch(0.25 0.03 70);
  --accent: oklch(0.28 0.04 70);
  --muted: oklch(0.2 0.02 70);
  --destructive: oklch(0.55 0.2 25);
  --border: oklch(0.25 0.02 70);
  --input: oklch(0.2 0.02 70);
  --ring: oklch(0.7 0.06 70);

  /* Entity Type Colors */
  --entity-character: oklch(0.65 0.15 25);
  --entity-location: oklch(0.6 0.12 145);
  --entity-item: oklch(0.7 0.15 75);
  --entity-concept: oklch(0.6 0.18 280);
  --entity-event: oklch(0.65 0.12 220);

  /* Radius */
  --radius: 0.625rem;
}
```

#### Theme Variants

```css
[data-theme='twilight-study'] {
  --background: oklch(0.12 0.03 280);
  --foreground: oklch(0.9 0.01 280);
  --primary: oklch(0.7 0.15 280);
}

[data-theme='amber-archive'] {
  --background: oklch(0.12 0.02 60);
  --foreground: oklch(0.87 0.02 80);
  --primary: oklch(0.72 0.15 75);
}
```

#### Utility Layers

```css
@layer utilities {
  /* Paper Grain Texture */
  .paper-grain::before {
    content: '';
    position: absolute;
    inset: 0;
    opacity: 0.03;
    pointer-events: none;
    background-image: url('data:image/svg+xml,%3Csvg...');
  }

  /* Vignette Effect */
  .vignette {
    box-shadow: inset 0 0 100px oklch(0 0 0 / 0.4);
  }

  /* Text Glow */
  .glow-text {
    text-shadow: 0 0 15px var(--primary);
  }
}
```

---

## Testing Configuration

### Vitest Setup (`vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'edge-runtime',
    setupFiles: ['./src/__tests__/setup.ts'],
    server: { deps: { inline: ['convex-test'] } },
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'convex/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.output/',
        'convex/_generated/',
        'src/test/',
        '**/*.d.ts',
        '**/__tests__/**',
        'routeTree.gen.ts',
      ],
    },
  },
});
```

### Test Setup (`src/__tests__/setup.ts`)

```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

### Convex Testing Pattern

```typescript
import { convexTest } from 'convex-test';
import { describe, it, expect, beforeEach } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';

describe('projects', () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema);
  });

  it('creates project with initialized stats', async () => {
    const id = await t.mutation(api.projects.create, {
      userId: 'user123',
      name: 'Test World',
    });

    const project = await t.run(async (ctx) => await ctx.db.get(id));

    expect(project).toMatchObject({
      name: 'Test World',
      stats: {
        documentCount: 0,
        entityCount: 0,
        factCount: 0,
        alertCount: 0,
      },
    });
  });
});
```

### Coverage Targets

| Module                    | Target  | Type               |
| ------------------------- | ------- | ------------------ |
| `convex/*.ts`             | 100%    | Unit (convex-test) |
| `src/lib/utils.ts`        | 100%    | Unit               |
| `src/components/ui/*.tsx` | 85%     | Integration        |
| `src/routes/*.tsx`        | 80%     | Integration        |
| **Overall**               | **80%** | Unit + Integration |

---

## Environment Variables

### Server Variables (`CONVEX_DEPLOYMENT`)

```typescript
// Required
OPENROUTER_API_KEY: string  // OpenRouter API key for LLM calls
SENTRY_DSN?: string         // Sentry DSN for error tracking

// Convex-managed
CONVEX_DEPLOYMENT: string    // Auto-injected by Convex
```

### Client Variables (`.env`)

```typescript
VITE_CONVEX_URL: string; // Convex deployment URL
VITE_APP_TITLE: string; // "Realm Sync"
```

### Environment Validation (`src/env.ts`)

```typescript
import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    OPENROUTER_API_KEY: z.string().min(1),
    SENTRY_DSN: z.string().optional(),
  },
  client: {
    VITE_CONVEX_URL: z.string().url(),
    VITE_APP_TITLE: z.string().default('Realm Sync'),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
```

---

## Commands

```bash
# Development
pnpm dev                    # Start dev server (includes instrumentation)

# Build & Production
pnpm build                  # Build for production (includes instrumentation)
pnpm preview                # Preview production build locally
pnpm start                  # Start production server

# Testing
pnpm test                   # Run all tests
pnpm test:ui                # Run tests with UI
pnpm test:coverage          # Run with coverage report

# Code Quality
pnpm format                 # Format with Prettier
pnpm lint                   # Lint with Oxlint

# Convex
npx convex dev              # Start Convex backend
npx convex deploy           # Deploy to production
npx convex functions logs   # View function logs

# Documentation
pnpm docs:list             # List all docs
```

---

## Current Codebase State

### Functional (Keep)

- ✅ TanStack Start + React 19 routing infrastructure
- ✅ Convex integration with provider (`src/integrations/convex/provider.tsx`)
- ✅ 17 Shadcn UI primitives (`src/components/ui/`)
- ✅ Tailwind v4 with OKLCH design tokens (`src/styles.css`)
- ✅ Base layout with Header (`src/routes/__root.tsx`)
- ✅ Sentry instrumentation (`instrument.server.mjs`)
- ✅ Vellum AI Chat with streaming (`src/components/VellumChat.tsx`)
- ✅ Interactive Tutorial Tour (`src/components/TutorialTour.tsx`)
- ✅ Command Palette (`src/components/CommandPalette.tsx`)
- ✅ Keyboard Shortcuts (`src/components/KeyboardShortcuts.tsx`)
- ✅ Chat History Persistence (`convex/chatHistory.ts`)
- ✅ Demo Project Seeding (`convex/tutorial.ts`)

### Placeholder/Demo (Remove in Phase 1)

- ❌ `convex/schema.ts` — Only contains `todos` and `products` tables
- ❌ `convex/todos.ts` — Standard CRUD example
- ❌ `src/routes/index.tsx` — Renders `<ComponentExample />`
- ❌ `src/routes/demo.theme.tsx` — Design system showcase
- ❌ `src/components/component-example.tsx` — Demo component grid

### Missing (Implement by Phase)

- ❌ Auth implementation (Convex Auth)
- ❌ Real schema tables (users, projects, documents, notes, entities, facts, alerts, llmCache)
- ❌ Project/Document/Note CRUD functions
- ❌ LLM integration (OpenRouter, extraction prompts)
- ❌ Notes feature (collaborative writing space)
- ❌ Canon Browser routes and components
- ❌ Continuity checking system
- ❌ Vellum mascot integration

---

## Code Conventions

### Naming

- **Components**: PascalCase (`EntityCard.tsx`)
- **Files**: kebab-case for routes (`new-project.tsx`)
- **Functions**: camelCase (`extractFromDocument`)
- **Constants**: SCREAMING_SNAKE_CASE (`Vellum_SYSTEM_PROMPT`)
- **Types**: PascalCase (`ProjectId`, `Entity`)

### File Organization

- Routes: File-based (TanStack Start convention)
- Convex functions: One file per table domain
- UI components: `ui/` folder for primitives, root for feature components

### Import Paths

- Use `@/` alias for `./src/*`
- Convex imports: `import { api } from '../_generated/api'`
- Internal Convex functions: `import { internal } from '../_generated/server'`

### Error Handling

- Always throw explicit errors in Convex mutations
- Use specific error messages (case-insensitive matching in tests)
- Never use `as any` or `@ts-ignore`

### TypeScript

- Use `v.id()` validators for typed references
- Use generated types from `_generated/dataModel.d.ts`
- Use Zod for runtime validation in env.ts
- Maintain strict mode in tsconfig.json

---

## Performance Considerations

### Database

- Use indexes for all queries (avoid full table scans)
- Denormalize stats on `projects` table (avoid count queries)
- Paginate lists exceeding 50 items
- Use search indexes for full-text queries

### LLM

- Cache results with 7-day TTL
- Chunk documents at 3,000 tokens with 200-token overlap
- Batch multiple extractions when possible
- Use structured outputs to reduce parsing overhead

### Frontend

- Code splitting via route-based lazy loading
- Memoize expensive list filtering/sorting with `useMemo`
- Optimize re-renders with React Compiler (enabled)
- Implement virtual scrolling for long lists (>100 items)

---

## Security Considerations

### Authentication

- Use Convex Auth (Google OAuth + Email/Password)
- Store only minimal user data
- Implement token-based session management

### Data Validation

- Use `v` validators for all Convex function arguments
- Use Zod for environment variable validation
- Validate file types on upload

### Rate Limiting

- Implement LLM call queuing
- Cache aggressively to minimize API calls
- Implement per-user rate limits on sensitive operations

### Error Handling

- Never expose internal implementation details in error messages
- Log all errors to Sentry
- Implement graceful degradation when LLM fails

---

_Last Updated: January 2, 2026_
