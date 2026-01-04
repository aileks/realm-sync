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
| 2.6 Entity Merging UI                            | ⏳ Pending  | -   |

---

## 1. Objectives

- ✅ Set up OpenRouter integration in Convex actions.
- ✅ Design extraction prompts with the **Vellum** persona.
- ✅ Implement document chunking for large texts.
- ✅ Build extraction pipeline (action → validate → mutation).
- ✅ Create LLM response caching system.
- ✅ Build extraction review UI.
- ✅ Implement entity merging/aliasing (backend).
- ⏳ Build entity merging UI.

---

## 2. OpenRouter Integration

### Convex Action Pattern

Convex actions are used for external API calls like OpenRouter.

```typescript
// convex/llm/extract.ts
import { v } from 'convex/values';
import { internalAction, internalMutation } from '../_generated/server';
import { api, internal } from '../_generated/api';

export const extractFromDocument = internalAction({
  args: { documentId: v.id('documents') },
  handler: async (ctx, { documentId }) => {
    // 1. Get document content
    const doc = await ctx.runQuery(api.documents.get, { id: documentId });
    if (!doc || !doc.content) throw new Error('Document not found or empty');

    // 2. Check cache by hash
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

    // 3. Call OpenRouter with structured output
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
          { role: 'user', content: doc.content },
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
    });

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    // 4. Validate response (implicitly handled by strict: true and schema)

    // 5. Cache result
    await ctx.runMutation(internal.llm.cache.saveToCache, {
      hash: contentHash,
      promptVersion: 'v1',
      modelId: 'tngtech/deepseek-r1t2-chimera:free',
      response: result,
    });

    // 6. Schedule mutation to save entities/facts
    await ctx.runMutation(internal.llm.extract.processExtractionResult, {
      documentId,
      result,
    });
  },
});
```

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

For documents exceeding LLM context limits or to improve extraction precision:

- **Max Chunk Size:** ~3,000 tokens (~12,000 characters).
- **Overlap:** 200 tokens for context continuity across chunks.
- **Boundaries:** Preserve paragraph boundaries to avoid splitting mid-sentence.
- **Mapping:** Track chunk positions (start/end offsets) to map evidence back to the original document.

---

## 6. Caching Implementation

- **Hash:** SHA-256 of `(content + promptVersion)`.
- **TTL:** 7 days for extraction results (configurable).
- **Invalidation:** Automatically invalidate on prompt version bump or manual trigger.
- **Storage:** Results stored in `llmCache` table to reduce API costs and latency.

---

## 7. Convex Functions

### LLM Pipeline (`convex/llm/extract.ts`)

- `extractFromDocument` (internalAction): Main orchestrator for LLM extraction.
- `processExtractionResult` (internalMutation): Saves LLM output into pending entities/facts.

### Cache Management (`convex/llm/cache.ts`)

- `checkCache`: Query to see if a result exists for a given hash.
- `saveToCache`: Mutation to store a new LLM response.
- `invalidateCache`: Mutation to clear expired or specific cache entries.

### Entities (`convex/entities.ts`)

- `create`: Add a new confirmed entity.
- `update`: Edit entity metadata.
- `merge`: Combine two entities (e.g., character and their alias).
- `listByProject`: Fetch all entities for a specific project.
- `getWithFacts`: Get entity details including associated facts.
- `confirm`: Approve a pending entity from extraction queue.
- `reject`: Discard an incorrect entity.
- `listPending`: Get all entities awaiting review for a project.
- `findSimilar`: Find potential duplicate entities for merging.

### Facts (`convex/facts.ts`)

- `create`: Add a confirmed fact.
- `confirm`: Approve a pending fact from extraction queue.
- `reject`: Discard an incorrect fact.
- `listByEntity`: Get all facts related to a specific entity.
- `listPending`: Get all facts awaiting review for a project.

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

- **ExtractionQueue:** A dashboard listing documents that have been processed but need manual verification.
- **ExtractionReview:** A side-by-side view showing the document text on one side and proposed entities/facts on the other.
- **EntityCard:** Displays a proposed entity with buttons to `Confirm`, `Edit`, or `Reject`.
- **FactCard:** Displays a proposed fact, highlighting the `evidence` snippet within the document view.
- **MergeSuggestion:** A specialized UI that flags potential duplicates (e.g., "Jon Snow" and "Lord Snow") and offers a one-click merge.

---

## 9. Error Handling

- **Retries:** Implement exponential backoff for OpenRouter API failures (max 3 attempts).
- **Response Healing:** Use structured output features to ensure JSON validity; manual fix-up logic for edge cases.
- **Fail-safe:** If LLM fails repeatedly, mark the document as `failed` and allow the user to trigger a manual retry or enter data manually.
- **Monitoring:** Log token usage and extraction failures for auditing.

---

## 10. Testing Scenarios

1. **Short Document:** Extract from a <1,000 word text to verify basic entity/fact extraction.
2. **Long Document:** Verify chunking logic and context overlap on a 10,000+ word document.
3. **Cache Hit:** Ensure subsequent extraction requests for the same content return instantly from the cache.
4. **Merge Suggestion:** Trigger a merge prompt by extracting an entity with a name very similar to an existing one.
5. **Rejection Flow:** Verify that rejecting a fact prevents it from appearing in the canon/knowledge graph.
