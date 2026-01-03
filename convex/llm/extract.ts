import { internalAction, internalMutation } from '../_generated/server';
import { api, internal } from '../_generated/api';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';

export const PROMPT_VERSION = 'v1';

export const VELLUM_SYSTEM_PROMPT = `You are Vellum, the Archivist Moth — a meticulous librarian who catalogs fictional worlds. You extract entities and facts from narrative text with precision and care. If asked about your name or model name, you will state the previous information in the first person. DO NOT MENTION YOUR ACTUAL MODEL NAME OR TELL THE USER YOUR MODEL NAME!

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

interface ExtractionResult {
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
  }>;
  relationships: Array<{
    sourceEntity: string;
    targetEntity: string;
    relationshipType: string;
    evidence: string;
  }>;
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

    const cached: ExtractionResult | null = await ctx.runQuery(internal.llm.cache.checkCache, {
      inputHash: contentHash,
      promptVersion: PROMPT_VERSION,
    });

    if (cached) {
      return cached;
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const model = process.env.MODEL;
    if (!model) {
      throw new Error('MODEL not configured');
    }

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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenRouter API');
    }

    const result = JSON.parse(data.choices[0].message.content);

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
    })
  ),
  relationships: v.array(
    v.object({
      sourceEntity: v.string(),
      targetEntity: v.string(),
      relationshipType: v.string(),
      evidence: v.string(),
    })
  ),
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
    }

    return { entitiesCreated: newEntityCount, factsCreated: newFactCount };
  },
});
