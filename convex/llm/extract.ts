import { internalAction, internalMutation, action } from '../_generated/server';
import { api, internal } from '../_generated/api';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import { chunkDocument, needsChunking, mapEvidenceToDocument, type Chunk } from './chunk';
import { err, apiError } from '../lib/errors';
import { unwrapOrThrow, safeJsonParse } from '../lib/result';

export const PROMPT_VERSION = 'v1';

export const VELLUM_SYSTEM_PROMPT = `You are Vellum, the Archivist Moth — a meticulous librarian who catalogs fictional worlds. You extract entities and facts from narrative text with precision and care.


PRINCIPLES:
- Only extract what is EXPLICITLY stated in the text.
- Always cite the exact evidence (quote the relevant passage).
- Assign confidence scores: 1.0 for explicit statements, 0.7-0.9 for strong implications, 0.5-0.6 for weak implications.
- Never invent or assume facts not present in the text.
- Identify entity types: character, location, item, concept, event.
- Extract relationships between entities.
- Note temporal information when present.

OUTPUT: Return structured JSON matching the provided schema.`;

export const EXTRACTION_SCHEMA = {
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
} as const;

type ExtractionResult = {
  entities: Array<{
    name: string;
    type: 'character' | 'location' | 'item' | 'concept' | 'event';
    description?: string;
    aliases?: string[];
  }>;
  facts: Array<{
    entityName: string;
    subject: string;
    predicate: string;
    object: string;
    confidence: number;
    evidence: string;
    temporalBound?: {
      type: 'point' | 'range' | 'relative';
      value: string;
    };
    evidencePosition?: {
      start: number;
      end: number;
    };
  }>;
  relationships: Array<{
    sourceEntity: string;
    targetEntity: string;
    relationshipType: string;
    evidence: string;
    evidencePosition?: {
      start: number;
      end: number;
    };
  }>;
};

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
        json_schema: {
          name: 'canon_extraction',
          strict: true,
          schema: EXTRACTION_SCHEMA,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    unwrapOrThrow(
      err(apiError(response.status, `OpenRouter API error: ${response.statusText} - ${errorText}`))
    );
  }

  const data = await response.json();
  if (!data.choices?.[0]?.message?.content) {
    unwrapOrThrow(err(apiError(500, 'Invalid response from OpenRouter API')));
  }

  let llmResponse = data.choices[0].message.content.trim();

  if (llmResponse.startsWith('```')) {
    llmResponse = llmResponse.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const parsed = unwrapOrThrow(safeJsonParse(llmResponse));
  return normalizeExtractionResult(parsed);
}

type EntityType = 'character' | 'location' | 'item' | 'concept' | 'event';

const VALID_ENTITY_TYPES: Set<string> = new Set([
  'character',
  'location',
  'item',
  'concept',
  'event',
]);

// Map invalid LLM entity types to valid ones
function normalizeEntityType(rawType: unknown): EntityType {
  const type = String(rawType ?? '').toLowerCase();
  if (VALID_ENTITY_TYPES.has(type)) {
    return type as EntityType;
  }
  // Map common LLM hallucinations to valid types
  const typeMap: Record<string, EntityType> = {
    group: 'concept',
    organization: 'concept',
    faction: 'concept',
    creature: 'character',
    animal: 'character',
    person: 'character',
    place: 'location',
    area: 'location',
    region: 'location',
    object: 'item',
    artifact: 'item',
    weapon: 'item',
    tool: 'item',
    idea: 'concept',
    theme: 'concept',
    occurrence: 'event',
    incident: 'event',
  };
  return typeMap[type] ?? 'concept';
}

function normalizeExtractionResult(raw: unknown): ExtractionResult {
  const result = raw as Record<string, unknown>;

  const entities: ExtractionResult['entities'] = [];
  const facts: ExtractionResult['facts'] = [];
  const relationships: ExtractionResult['relationships'] = [];

  // Normalize entities: handle object-keyed format {name: {type, ...}} → [{name, type, ...}]
  // Strip extra fields (LLMs sometimes add confidence/evidence to entities despite schema)
  if (result.entities) {
    if (Array.isArray(result.entities)) {
      for (const e of result.entities as Array<Record<string, unknown>>) {
        entities.push({
          name: e.name as string,
          type: normalizeEntityType(e.type),
          description: e.description as string | undefined,
          aliases: e.aliases as string[] | undefined,
        });
      }
    } else if (typeof result.entities === 'object') {
      for (const [name, data] of Object.entries(result.entities as Record<string, unknown>)) {
        const entityData = data as Record<string, unknown>;
        entities.push({
          name,
          type: normalizeEntityType(entityData.type),
          description: entityData.description as string | undefined,
          aliases: entityData.aliases as string[] | undefined,
        });
      }
    }
  }

  if (result.facts) {
    const rawFacts: Array<Record<string, unknown>> =
      Array.isArray(result.facts) ?
        (result.facts as Array<Record<string, unknown>>)
      : Object.entries(result.facts as Record<string, unknown>).map(([key, data]) => {
          const d = data as Record<string, unknown>;
          return { ...d, entityName: d.entityName ?? key, subject: d.subject ?? key };
        });

    for (const f of rawFacts) {
      const tb = f.temporalBound as Record<string, unknown> | undefined;
      const validTb =
        tb?.type && tb?.value ?
          { type: tb.type as 'point' | 'range' | 'relative', value: tb.value as string }
        : undefined;

      const rawEvidence = f.evidence;
      const evidence =
        Array.isArray(rawEvidence) ? rawEvidence.join(' ') : ((rawEvidence as string) ?? '');

      facts.push({
        entityName: (f.entityName as string) ?? '',
        subject: (f.subject as string) ?? '',
        predicate: (f.predicate as string) ?? '',
        object: (f.object as string) ?? '',
        confidence: (f.confidence as number) ?? 0.8,
        evidence,
        temporalBound: validTb,
        evidencePosition: f.evidencePosition as { start: number; end: number } | undefined,
      });
    }
  }

  if (result.relationships) {
    if (Array.isArray(result.relationships)) {
      for (const r of result.relationships as Array<Record<string, unknown>>) {
        const rawEvidence = r.evidence;
        const evidence =
          Array.isArray(rawEvidence) ? rawEvidence.join(' ') : ((rawEvidence as string) ?? '');
        relationships.push({
          sourceEntity: (r.sourceEntity as string) ?? '',
          targetEntity: (r.targetEntity as string) ?? '',
          relationshipType: (r.relationshipType as string) ?? '',
          evidence,
          evidencePosition: r.evidencePosition as { start: number; end: number } | undefined,
        });
      }
    }
  }

  return { entities, facts, relationships };
}

function mergeExtractionResults(results: ExtractionResult[]): ExtractionResult {
  const entityMap = new Map<string, ExtractionResult['entities'][0]>();
  const facts: ExtractionResult['facts'] = [];
  const relationships: ExtractionResult['relationships'] = [];

  for (const result of results) {
    for (const entity of result.entities ?? []) {
      const existing = entityMap.get(entity.name.toLowerCase());
      if (existing) {
        const mergedAliases = [
          ...new Set([...(existing.aliases ?? []), ...(entity.aliases ?? [])]),
        ];
        entityMap.set(entity.name.toLowerCase(), {
          ...existing,
          description: existing.description ?? entity.description,
          aliases: mergedAliases.length > 0 ? mergedAliases : undefined,
        });
      } else {
        entityMap.set(entity.name.toLowerCase(), entity);
      }
    }

    facts.push(...(result.facts ?? []));
    relationships.push(...(result.relationships ?? []));
  }

  return {
    entities: Array.from(entityMap.values()),
    facts,
    relationships,
  };
}

function adjustEvidencePositions(
  result: ExtractionResult,
  chunk: Chunk,
  documentContent: string
): ExtractionResult {
  const adjustedFacts = (result.facts ?? []).map((fact) => {
    const position = mapEvidenceToDocument(fact.evidence, chunk, documentContent);
    return {
      ...fact,
      evidencePosition: position ?? undefined,
    };
  });

  const adjustedRelationships = (result.relationships ?? []).map((rel) => {
    const position = mapEvidenceToDocument(rel.evidence, chunk, documentContent);
    return {
      ...rel,
      evidencePosition: position ?? undefined,
    };
  });

  return {
    entities: result.entities ?? [],
    facts: adjustedFacts,
    relationships: adjustedRelationships,
  };
}

export const extractFromDocument = internalAction({
  args: { documentId: v.id('documents') },
  handler: async (ctx, { documentId }): Promise<ExtractionResult> => {
    const doc = await ctx.runQuery(api.documents.get, { id: documentId });
    if (!doc || !doc.content) {
      throw new Error('Document not found or empty');
    }

    const contentHash: string = await ctx.runQuery(internal.llm.utils.computeHash, {
      content: doc.content,
    });

    const cached = await ctx.runQuery(internal.llm.cache.checkCache, {
      inputHash: contentHash,
      promptVersion: PROMPT_VERSION,
    });

    if (cached) {
      return normalizeExtractionResult(cached);
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const model = process.env.MODEL;
    if (!model) {
      throw new Error('MODEL not configured');
    }

    let result: ExtractionResult;

    if (needsChunking(doc.content)) {
      const chunks = chunkDocument(doc.content);
      const chunkResults: ExtractionResult[] = [];

      for (const chunk of chunks) {
        const chunkHash: string = await ctx.runQuery(internal.llm.utils.computeHash, {
          content: chunk.text,
        });

        const cachedChunk: ExtractionResult | null = await ctx.runQuery(
          internal.llm.cache.checkCache,
          { inputHash: chunkHash, promptVersion: PROMPT_VERSION }
        );

        let chunkResult: ExtractionResult;
        if (cachedChunk) {
          chunkResult = normalizeExtractionResult(cachedChunk);
        } else {
          chunkResult = await callLLM(chunk.text, apiKey, model);

          await ctx.runMutation(internal.llm.cache.saveToCache, {
            inputHash: chunkHash,
            promptVersion: PROMPT_VERSION,
            modelId: model,
            response: chunkResult,
          });
        }

        const adjustedResult = adjustEvidencePositions(chunkResult, chunk, doc.content);
        chunkResults.push(adjustedResult);
      }

      result = mergeExtractionResults(chunkResults);
    } else {
      const rawResult = await callLLM(doc.content, apiKey, model);
      const fullDocChunk: Chunk = {
        text: doc.content,
        startOffset: 0,
        endOffset: doc.content.length,
        index: 0,
      };
      result = adjustEvidencePositions(rawResult, fullDocChunk, doc.content);
    }

    await ctx.runMutation(internal.llm.cache.saveToCache, {
      inputHash: contentHash,
      promptVersion: PROMPT_VERSION,
      modelId: model,
      response: result,
    });

    return result;
  },
});

const extractionResultValidator = v.object({
  entities: v.array(
    v.object({
      name: v.string(),
      type: v.union(
        v.literal('character'),
        v.literal('location'),
        v.literal('item'),
        v.literal('concept'),
        v.literal('event')
      ),
      description: v.optional(v.string()),
      aliases: v.optional(v.array(v.string())),
    })
  ),
  facts: v.array(
    v.object({
      entityName: v.string(),
      subject: v.string(),
      predicate: v.string(),
      object: v.string(),
      confidence: v.number(),
      evidence: v.string(),
      temporalBound: v.optional(
        v.object({
          type: v.union(v.literal('point'), v.literal('range'), v.literal('relative')),
          value: v.string(),
        })
      ),
      evidencePosition: v.optional(
        v.object({
          start: v.number(),
          end: v.number(),
        })
      ),
    })
  ),
  relationships: v.array(
    v.object({
      sourceEntity: v.string(),
      targetEntity: v.string(),
      relationshipType: v.string(),
      evidence: v.string(),
      evidencePosition: v.optional(
        v.object({
          start: v.number(),
          end: v.number(),
        })
      ),
    })
  ),
});

export const chunkAndExtract = action({
  args: {
    documentId: v.id('documents'),
  },
  handler: async (
    ctx,
    { documentId }
  ): Promise<{ entitiesCreated: number; factsCreated: number }> => {
    await ctx.runMutation(api.documents.updateProcessingStatus, {
      id: documentId,
      status: 'processing',
    });

    try {
      const result: ExtractionResult = await ctx.runAction(
        internal.llm.extract.extractFromDocument,
        { documentId }
      );

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

export const processExtractionResult = internalMutation({
  args: {
    documentId: v.id('documents'),
    result: extractionResultValidator,
  },
  handler: async (ctx, { documentId, result }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc) {
      throw new Error('Document not found');
    }

    const projectId = doc.projectId;
    const now = Date.now();

    const entityNameToId = new Map<string, Id<'entities'>>();
    let newEntityCount = 0;
    let newFactCount = 0;

    for (const extractedEntity of result.entities) {
      const existing = await ctx.db
        .query('entities')
        .withIndex('by_name', (q) => q.eq('projectId', projectId).eq('name', extractedEntity.name))
        .first();

      if (existing) {
        entityNameToId.set(extractedEntity.name, existing._id);
      } else {
        const entityId = await ctx.db.insert('entities', {
          projectId,
          name: extractedEntity.name,
          type: extractedEntity.type,
          description: extractedEntity.description,
          aliases: extractedEntity.aliases ?? [],
          firstMentionedIn: documentId,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        });
        entityNameToId.set(extractedEntity.name, entityId);
        newEntityCount++;
      }
    }

    for (const extractedFact of result.facts) {
      const entityId = entityNameToId.get(extractedFact.entityName);
      if (!entityId) continue;

      await ctx.db.insert('facts', {
        projectId,
        entityId,
        documentId,
        subject: extractedFact.subject,
        predicate: extractedFact.predicate,
        object: extractedFact.object,
        confidence: extractedFact.confidence,
        evidenceSnippet: extractedFact.evidence,
        evidencePosition: extractedFact.evidencePosition,
        temporalBound: extractedFact.temporalBound,
        status: 'pending',
        createdAt: now,
      });
      newFactCount++;
    }

    for (const relationship of result.relationships) {
      const sourceEntityId = entityNameToId.get(relationship.sourceEntity);
      if (!sourceEntityId) continue;

      await ctx.db.insert('facts', {
        projectId,
        entityId: sourceEntityId,
        documentId,
        subject: relationship.sourceEntity,
        predicate: relationship.relationshipType,
        object: relationship.targetEntity,
        confidence: 1.0,
        evidenceSnippet: relationship.evidence,
        evidencePosition: relationship.evidencePosition,
        status: 'pending',
        createdAt: now,
      });
      newFactCount++;
    }

    await ctx.db.patch(documentId, {
      processingStatus: 'completed',
      processedAt: now,
      updatedAt: now,
    });

    const project = await ctx.db.get(projectId);
    if (project) {
      const stats = project.stats ?? {
        documentCount: 0,
        entityCount: 0,
        factCount: 0,
        alertCount: 0,
      };
      await ctx.db.patch(projectId, {
        updatedAt: now,
        stats: {
          ...stats,
          entityCount: stats.entityCount + newEntityCount,
          factCount: stats.factCount + newFactCount,
        },
      });

      const hasConfirmedCanon = stats.entityCount > 0 || stats.factCount > 0;
      if (hasConfirmedCanon) {
        await ctx.scheduler.runAfter(0, internal.checks.runCheck, { documentId });
      }
    }

    return { entitiesCreated: newEntityCount, factsCreated: newFactCount };
  },
});
