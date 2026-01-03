import { internalAction } from '../_generated/server';
import { api } from '../_generated/api';
import { v } from 'convex/values';

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

export const extractFromDocument = internalAction({
  args: { documentId: v.id('documents') },
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.runQuery(api.documents.get, { id: documentId });
    if (!doc || !doc.content) {
      throw new Error('Document not found or empty');
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

    return result;
  },
});
