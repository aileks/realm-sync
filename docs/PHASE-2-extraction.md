---
summary: Implementation details for the extraction phase (LLM pipeline, entities, facts).
read_when: [LLM integration, data extraction, document processing]
---

# Phase 2: Canon Extraction Pipeline - Realm Sync

## Overview

Phase 2 focuses on the LLM-powered pipeline that extracts entities, facts, and relationships from documents. This pipeline transforms raw narrative text into structured data for the canon tracking system.

**Goal:** Build the LLM-powered pipeline that extracts entities and facts from documents. **Duration:** 1-2 weeks **Dependencies:** Phase 1 complete (schema, auth, document CRUD)

---

## Implementation Progress

| Sub-Phase                                        | Status      | PR  |
| ------------------------------------------------ | ----------- | --- |
| 2.1 OpenRouter Integration                       | ✅ Complete | #2  |
| 2.2 LLM Cache                                    | ✅ Complete | #3  |
| 2.3 Entity & Fact CRUD + processExtractionResult | ✅ Complete | #4  |
| 2.4 Document Chunking                            | ✅ Complete | #5  |
| 2.5 Extraction Review UI                         | ✅ Complete | #7  |
| 2.6 Error Handling & Recovery                    | ✅ Complete | #9  |
| 2.7 Entity Merging UI                            | ⏳ Pending  | -   |

---

## 1. Objectives

- ✅ Set up OpenRouter integration in Convex actions.
- ✅ Design extraction prompts with the **Vellum** persona.
- ✅ Implement document chunking for large texts.
- ✅ Build extraction pipeline (action → validate → mutation).
- ✅ Create LLM response caching system.
- ✅ Build extraction review UI.
- ✅ Implement entity merging/aliasing (backend).
- ✅ Add toast notifications and error recovery.
- ⏳ Build entity merging UI.

---

## 2. OpenRouter Integration

### Public Action: `chunkAndExtract`

The main entry point for extraction, triggered from the frontend via `useAction`.

```typescript
// convex/llm/extract.ts
export const chunkAndExtract = action({
  args: { documentId: v.id('documents') },
  handler: async (
    ctx,
    { documentId }
  ): Promise<{ entitiesCreated: number; factsCreated: number }> => {
    await ctx.runMutation(api.documents.updateProcessingStatus, {
      id: documentId,
      status: 'processing',
    });

    try {
      const result = await ctx.runAction(internal.llm.extract.extractFromDocument, { documentId });
      return await ctx.runMutation(internal.llm.extract.processExtractionResult, {
        documentId,
        result,
      });
    } catch (error) {
      await ctx.runMutation(api.documents.updateProcessingStatus, {
        id: documentId,
        status: 'failed',
      });
      throw error;
    }
  },
});
```

### Internal Action: `extractFromDocument`

Orchestrates LLM extraction with caching and chunking.

```typescript
export const extractFromDocument = internalAction({
  args: { documentId: v.id('documents') },
  handler: async (ctx, { documentId }): Promise<ExtractionResult> => {
    const doc = await ctx.runQuery(api.documents.get, { id: documentId });
    if (!doc || !doc.content) throw new Error('Document not found or empty');

    // Check cache
    const contentHash = await ctx.runQuery(internal.llm.utils.computeHash, {
      content: doc.content,
    });
    const cached = await ctx.runQuery(internal.llm.cache.checkCache, {
      inputHash: contentHash,
      promptVersion: PROMPT_VERSION,
    });
    if (cached) return cached;

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.MODEL;

    // Chunk if needed, extract, merge results
    if (needsChunking(doc.content)) {
      const chunks = chunkDocument(doc.content);
      const chunkResults = [];
      for (const chunk of chunks) {
        // Per-chunk caching + extraction
        const chunkResult = await callLLM(chunk.text, apiKey, model);
        const adjusted = adjustEvidencePositions(chunkResult, chunk, doc.content);
        chunkResults.push(adjusted);
      }
      return mergeExtractionResults(chunkResults);
    }

    return await callLLM(doc.content, apiKey, model);
  },
});
```

### LLM Response Handling

The `callLLM` function handles markdown-wrapped responses from some models:

````typescript
async function callLLM(content: string, apiKey: string, model: string): Promise<ExtractionResult> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://realmsync.app',
      'X-Title': 'Realm Sync',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: VELLUM_SYSTEM_PROMPT },
        { role: 'user', content },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'canon_extraction', strict: true, schema: EXTRACTION_SCHEMA },
      },
    }),
  });

  const data = await response.json();
  let llmResponse = data.choices[0].message.content.trim();

  // Strip markdown code blocks: ```json\n{...}\n``` → {...}
  if (llmResponse.startsWith('```')) {
    llmResponse = llmResponse.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  return JSON.parse(llmResponse);
}
````

---

## 3. Extraction Prompt (Vellum Persona)

**Vellum, the Archivist Moth**, is the meticulous librarian persona responsible for cataloging fictional worlds.

```text
You are Vellum, the Archivist Moth — a meticulous librarian who catalogs fictional worlds. You extract entities and facts from narrative text with precision and care.

PRINCIPLES:
- Only extract what is EXPLICITLY stated in the text.
- Always cite the exact evidence (quote the relevant passage).
- Assign confidence scores: 1.0 for explicit statements, 0.7-0.9 for strong implications, 0.5-0.6 for weak implications.
- Never invent or assume facts not present in the text.
- Identify entity types: character, location, item, concept, event.
- Extract relationships between entities.
- Note temporal information when present.

OUTPUT: Return structured JSON matching the provided schema.
```

---

## 4. Extraction JSON Schema

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
        required: ['entityName', 'subject', 'predicate', 'object', 'confidence', 'evidence'],
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
        required: ['sourceEntity', 'targetEntity', 'relationshipType', 'evidence'],
        additionalProperties: false,
      },
    },
  },
  required: ['entities', 'facts', 'relationships'],
  additionalProperties: false,
};
```

---

## 5. Document Chunking Strategy

Implemented in `convex/llm/chunk.ts`:

| Parameter         | Value  | Description                                     |
| ----------------- | ------ | ----------------------------------------------- |
| `MAX_CHUNK_CHARS` | 12,000 | Maximum characters per chunk (~3,000 tokens)    |
| `OVERLAP_CHARS`   | 800    | Overlap between chunks for context continuity   |
| `MIN_CHUNK_CHARS` | 1,000  | Minimum chunk size to avoid splitting too small |

**Boundary Detection:**

1. Double newline (paragraph break) - preferred
2. Single newline
3. Sentence-ending punctuation (`. ! ?`)
4. Hard cut at max if no boundary found

**Evidence Position Mapping:**

- `mapEvidenceToDocument()` converts chunk-relative positions to document-absolute positions
- Fuzzy matching as fallback when exact match fails

---

## 6. Caching Implementation

Implemented in `convex/llm/cache.ts`:

- **Hash:** SHA-256 of content (computed via `convex/llm/utils.ts`)
- **Key:** `(inputHash, promptVersion)` - cache invalidates on prompt changes
- **Granularity:** Both full-document and per-chunk caching
- **Storage:** Results stored in `llmCache` table

```typescript
// Check cache
const cached = await ctx.runQuery(internal.llm.cache.checkCache, {
  inputHash: contentHash,
  promptVersion: PROMPT_VERSION,
});

// Save to cache
await ctx.runMutation(internal.llm.cache.saveToCache, {
  inputHash: contentHash,
  promptVersion: PROMPT_VERSION,
  modelId: model,
  response: result,
});
```

---

## 7. Convex Functions

### LLM Pipeline (`convex/llm/extract.ts`)

| Function                  | Type             | Description                               |
| ------------------------- | ---------------- | ----------------------------------------- |
| `chunkAndExtract`         | action (public)  | Entry point for frontend; handles status  |
| `extractFromDocument`     | internalAction   | Orchestrates chunking, caching, LLM calls |
| `processExtractionResult` | internalMutation | Saves entities/facts to DB, updates stats |

### Cache Management (`convex/llm/cache.ts`)

| Function        | Type             | Description                           |
| --------------- | ---------------- | ------------------------------------- |
| `checkCache`    | query            | Look up cached result by hash+version |
| `saveToCache`   | internalMutation | Store new LLM response                |
| `invalidateAll` | mutation         | Clear all cache entries               |

### Chunking (`convex/llm/chunk.ts`)

| Function                | Type     | Description                                 |
| ----------------------- | -------- | ------------------------------------------- |
| `chunkDocument`         | function | Split content into overlapping chunks       |
| `needsChunking`         | function | Check if content exceeds max chunk size     |
| `mapEvidenceToDocument` | function | Map evidence positions to original document |
| `getChunks`             | query    | Expose chunking for testing/debugging       |

### Entities (`convex/entities.ts`)

| Function        | Type     | Description                             |
| --------------- | -------- | --------------------------------------- |
| `create`        | mutation | Add new entity (pending by default)     |
| `update`        | mutation | Edit entity metadata                    |
| `merge`         | mutation | Combine two entities (source → target)  |
| `confirm`       | mutation | Approve pending entity                  |
| `reject`        | mutation | Delete entity and its facts             |
| `remove`        | mutation | Delete entity (same as reject)          |
| `get`           | query    | Get single entity                       |
| `getWithFacts`  | query    | Get entity with all associated facts    |
| `listByProject` | query    | List entities with optional type/status |
| `listPending`   | query    | Get pending entities for project        |
| `findByName`    | query    | Find entity by exact name               |
| `findSimilar`   | query    | Find potential duplicates for merging   |

### Facts (`convex/facts.ts`)

| Function         | Type     | Description                               |
| ---------------- | -------- | ----------------------------------------- |
| `create`         | mutation | Add new fact                              |
| `update`         | mutation | Edit fact details                         |
| `confirm`        | mutation | Approve pending fact                      |
| `reject`         | mutation | Mark fact as rejected (soft delete)       |
| `remove`         | mutation | Hard delete fact                          |
| `get`            | query    | Get single fact                           |
| `listByEntity`   | query    | Get facts for entity with optional status |
| `listByDocument` | query    | Get facts extracted from document         |
| `listByProject`  | query    | Get all facts for project                 |
| `listPending`    | query    | Get pending facts for project             |

### Seed Data (`convex/seed.ts`)

| Function        | Type     | Description                               |
| --------------- | -------- | ----------------------------------------- |
| `seedProject`   | mutation | Create sample project with entities/facts |
| `clearSeedData` | mutation | Delete all seed data for a project        |

### Seed Data (`convex/seed.ts`)

- `seedProject`: Creates a sample fantasy project ("The Northern Chronicles") with:
  - 2 documents with narrative content
  - 7 entities (characters, locations, concepts, events)
  - 8 facts with evidence positions
- `clearSeedData`: Deletes all seed data for a project.

**Note**: To use seed data, run `api.seed.seedProject` mutation via Convex dashboard with a valid `userId`.

**Usage Instructions:**

1. Run `api.seed.seedProject({ userId: "<your-user-id>" })` in the Convex dashboard.
2. To clean up seed data, run `api.seed.clearSeedData({ projectId })`.

---

## 8. Review UI Components

### Routes

| Route                              | Component       | Purpose                       |
| ---------------------------------- | --------------- | ----------------------------- |
| `/projects/:id/review`             | Layout          | Review section container      |
| `/projects/:id/review/`            | Index           | List documents needing review |
| `/projects/:id/review/:documentId` | Document Review | Review entities/facts for doc |

### Features

- **Document Queue:** Lists documents with `processingStatus: 'completed'` that have pending entities/facts
- **Entity Review:** Confirm/reject extracted entities with inline editing
- **Fact Review:** Confirm/reject facts with evidence highlighting
- **Batch Actions:** Confirm all or reject all for efficiency

---

## 9. Error Handling & Recovery

### Processing Status Flow

```
pending → processing → completed
                    ↘ failed
```

### Error Recovery (PR #9)

| Scenario                       | Behavior                                          |
| ------------------------------ | ------------------------------------------------- |
| Extraction fails               | Status set to `failed`, error toast shown         |
| Failed document                | Red "Retry" button, can re-trigger extraction     |
| Stuck in processing            | "Reset" button after 2 minutes, resets to pending |
| Markdown-wrapped JSON          | Automatically stripped before parsing             |
| Missing arrays in LLM response | Defensive `?? []` fallbacks                       |

### Frontend Toast Notifications

```typescript
// On extraction start
toast.info('Extraction started', { description: "You'll be notified when it finishes." });

// On success
toast.success('Extraction complete', {
  description: `Found ${result.entitiesCreated} entities and ${result.factsCreated} facts.`,
});

// On failure
toast.error('Extraction failed', {
  description: error.message,
});
```

---

## 10. Testing Scenarios

All tests in `convex/__tests__/`:

1. **Entity CRUD:** Create, update, merge, confirm, reject entities
2. **Fact CRUD:** Create, confirm, reject, list by entity/document
3. **Chunking:** Verify chunk boundaries, overlap, evidence mapping
4. **Caching:** Cache hits, misses, invalidation
5. **Extraction:** Full pipeline with mocked LLM responses

**Test Command:** `pnpm test`
