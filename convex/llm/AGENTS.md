---
read_when: working with LLM extraction, caching, or document chunking
---

# convex/llm/

**Scope:** LLM operations—document chunking, extraction pipeline, response caching

## STRUCTURE

```
llm/
├── cache.ts     # LLM response caching (7-day TTL, SHA-256 hashing)
├── chunk.ts     # Document chunking (12000 chars, 800 overlap)
├── extract.ts   # Extraction action + processExtractionResult
└── utils.ts     # Hash utilities (crypto.subtle.digest)
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Cache lookups | `checkCache()` internal query | Returns cached response or null |
| Cache storage | `saveToCache()` internal mutation | 7-day TTL |
| Document chunking | `chunkDocument()` | Splits into overlapping chunks |
| LLM extraction | `chunkAndExtract()` action | Public entry point |
| Extraction schema | `EXTRACTION_SCHEMA` const | JSON schema for LLM output |
| System prompt | `VELLUM_SYSTEM_PROMPT` const | Archivist Moth persona |

## CONSTANTS

```
MAX_CHUNK_CHARS = 12000   # Max per chunk
OVERLAP_CHARS = 800       # Context overlap
MIN_CHUNK_CHARS = 1000    # Min before boundary search
PROMPT_VERSION = 'v1'     # Cache key component
```

## CACHING PATTERN

```typescript
// Check cache (internal query)
const cached = await ctx.runQuery(internal.llmExtract.checkCache, {
  inputHash: computedHash,
  promptVersion: 'v1',
});

if (cached) return cached; // Cache hit

// Save to cache (internal mutation)
await ctx.runMutation(internal.llmExtract.saveToCache, {
  inputHash: computedHash,
  promptVersion: 'v1',
  modelId: 'openai/gpt-4',
  response: apiResponse,
});
```

**Cache Key:** `{ inputHash, promptVersion, modelId }`

## EXTRACTION PIPELINE

```typescript
// Public action entry point
const result = await ctx.runAction(api.llm.chunkAndExtract, {
  documentId: docId,
  promptVersion: 'v1',
});

// result: { entities: [...], facts: [...] }
```

**Pipeline:** Check cache → Fetch document → Chunk → LLM API per chunk → Save to cache → Merge results

## INTERNAL VS PUBLIC

```
internalQuery → checkCache
internalMutation → saveToCache, invalidateCache
internalAction → extractFromDocument (chunk-level)
action → chunkAndExtract (public)
```

## SYSTEM PROMPT

```
You are Vellum, Archivist Moth — meticulous librarian.

PRINCIPLES:
- Extract EXPLICITLY stated text only
- Cite exact evidence
- Confidence: 1.0 (explicit), 0.7-0.9 (strong), 0.5-0.6 (weak)
- Never invent facts
- Entity types: character, location, item, concept, event
- Extract relationships
- Note temporal info
```

## EXTRACTION SCHEMA

```typescript
{
  entities: [{
    name: string,
    type: 'character' | 'location' | 'item' | 'concept' | 'event',
    description?: string,
    aliases: string[]
  }],
  facts: [{
    subject: string,
    predicate: string,
    object: string,
    evidence: string,  // Quote from text
    confidence: number // 0.0-1.0
  }]
}
```

## CONVENTIONS

- Always use `chunkDocument()` - don't implement custom splitting
- 7-day cache TTL - use `checkCache()` before API calls
- Internal for backend orchestration, public for frontend
- Always include `promptVersion` in cache keys
- SHA-256 via `crypto.subtle.digest()` (browser/server compatible)
- `mapEvidenceToDocument()` for fuzzy matching

## ANTI-PATTERNS

| Pattern                        | Why                                 |
| ------------------------------ | ----------------------------------- |
| Direct LLM calls without cache | Use `checkCache()`/`saveToCache()`  |
| Manual chunking logic          | Use `chunkDocument()`               |
| Ignore prompt version          | Include in all cache keys           |
| Hardcoded prompt text          | Use `VELLUM_SYSTEM_PROMPT`          |
| Call internal from frontend    | Internal functions are backend-only |

## NOTES

- Cache TTL: 7 days (configured in saveToCache)
- Chunk overlap: 800 chars for context
- Boundary search: paragraphs → sentences → punctuation
- Evidence mapping uses fuzzy search
- LLM model name in system prompt: "DO NOT MENTION YOUR ACTUAL MODEL NAME"
