import { v } from 'convex/values';
import { internalAction, internalMutation, action } from './_generated/server';
import { internal, api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { err, apiError } from './lib/errors';
import { unwrapOrThrow, safeJsonParse } from './lib/result';

const PROMPT_VERSION = 'check-v1';

const VELLUM_CHECK_PROMPT = `You are Vellum, the Archivist Moth. You are reviewing new text against established canon to identify inconsistencies.

ESTABLISHED CANON:
{canonContext}

NEW TEXT TO CHECK:
{documentContent}

TASK:
Identify any inconsistencies between the new text and established canon. For each issue found:
1. Classify the type: contradiction, timeline, ambiguity.
2. Quote the conflicting evidence from BOTH sources.
3. Explain the inconsistency clearly.
4. Suggest a possible resolution.
5. Assign severity: error (definite conflict) or warning (potential issue).

Only report REAL inconsistencies. Do not flag:
- New information that doesn't conflict.
- Intentional character development.
- Different perspectives on the same event.

OUTPUT: Return structured JSON matching the provided schema.`;

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
                entityName: { type: 'string' },
              },
              required: ['source', 'quote'],
              additionalProperties: false,
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
      additionalProperties: false,
    },
  },
  required: ['alerts', 'summary'],
  additionalProperties: false,
} as const;

type CheckResult = {
  alerts: Array<{
    type: 'contradiction' | 'timeline' | 'ambiguity';
    severity: 'error' | 'warning';
    title: string;
    description: string;
    evidence: Array<{
      source: 'canon' | 'new_document';
      quote: string;
      entityName?: string;
    }>;
    suggestedFix?: string;
    affectedEntities?: string[];
  }>;
  summary: {
    totalIssues: number;
    errors: number;
    warnings: number;
    checkedEntities: string[];
  };
};

type CanonContextEntity = {
  id: Id<'entities'>;
  name: string;
  type: string;
  facts: Array<{
    id: Id<'facts'>;
    predicate: string;
    object: string;
    evidence: string;
    documentTitle: string;
  }>;
};

type CanonContext = {
  entities: CanonContextEntity[];
  formattedContext: string;
};

async function buildCanonContext(
  ctx: {
    runQuery: <T>(ref: unknown, args: unknown) => Promise<T>;
  },
  projectId: Id<'projects'>
): Promise<CanonContext> {
  type EntityRecord = { _id: Id<'entities'>; name: string; type: string };
  type FactRecord = {
    _id: Id<'facts'>;
    status: string;
    documentId: Id<'documents'>;
    predicate: string;
    object: string;
    evidenceSnippet: string;
  };
  type EntityWithFacts = { entity: EntityRecord; facts: FactRecord[] } | null;
  type DocumentRecord = { title: string } | null;

  const entities = (await ctx.runQuery(api.entities.listByProject, {
    projectId,
    status: 'confirmed',
  })) as EntityRecord[];

  const entitiesWithFacts: CanonContextEntity[] = [];
  let formattedContext = '';

  for (const entity of entities) {
    const entityData = (await ctx.runQuery(api.entities.getWithFacts, {
      id: entity._id,
    })) as EntityWithFacts;
    if (!entityData) continue;

    const confirmedFacts = entityData.facts.filter((f: FactRecord) => f.status === 'confirmed');
    if (confirmedFacts.length === 0) continue;

    const factsWithDocs = await Promise.all(
      confirmedFacts.map(async (fact: FactRecord) => {
        const doc = (await ctx.runQuery(api.documents.get, {
          id: fact.documentId,
        })) as DocumentRecord;
        return {
          id: fact._id,
          predicate: fact.predicate,
          object: fact.object,
          evidence: fact.evidenceSnippet,
          documentTitle: doc?.title ?? 'Unknown',
        };
      })
    );

    entitiesWithFacts.push({
      id: entity._id,
      name: entity.name,
      type: entity.type,
      facts: factsWithDocs,
    });

    formattedContext += `\n## Entity: ${entity.name}\n`;
    formattedContext += `Type: ${entity.type}\n`;
    formattedContext += `Facts:\n`;
    for (const fact of factsWithDocs) {
      formattedContext += `- ${fact.predicate} ${fact.object} [${fact.documentTitle}]\n`;
    }
  }

  return { entities: entitiesWithFacts, formattedContext };
}

async function callCheckLLM(
  canonContext: string,
  documentContent: string,
  apiKey: string,
  model: string
): Promise<CheckResult> {
  const prompt = VELLUM_CHECK_PROMPT.replace('{canonContext}', canonContext).replace(
    '{documentContent}',
    documentContent
  );

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
      messages: [{ role: 'user', content: prompt }],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'continuity_check',
          strict: true,
          schema: CHECK_SCHEMA,
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
  return normalizeCheckResult(parsed);
}

function normalizeCheckResult(raw: unknown): CheckResult {
  const result = raw as Record<string, unknown>;

  const alerts: CheckResult['alerts'] = [];

  if (result.alerts && Array.isArray(result.alerts)) {
    for (const a of result.alerts as Array<Record<string, unknown>>) {
      const evidence: CheckResult['alerts'][0]['evidence'] = [];

      if (a.evidence && Array.isArray(a.evidence)) {
        for (const e of a.evidence as Array<Record<string, unknown>>) {
          evidence.push({
            source: (e.source as 'canon' | 'new_document') ?? 'new_document',
            quote: (e.quote as string) ?? '',
            entityName: e.entityName as string | undefined,
          });
        }
      }

      alerts.push({
        type: (a.type as CheckResult['alerts'][0]['type']) ?? 'ambiguity',
        severity: (a.severity as CheckResult['alerts'][0]['severity']) ?? 'warning',
        title: (a.title as string) ?? 'Unknown Issue',
        description: (a.description as string) ?? '',
        evidence,
        suggestedFix: a.suggestedFix as string | undefined,
        affectedEntities: a.affectedEntities as string[] | undefined,
      });
    }
  }

  const summary = result.summary as Record<string, unknown> | undefined;

  return {
    alerts,
    summary: {
      totalIssues: (summary?.totalIssues as number) ?? alerts.length,
      errors: (summary?.errors as number) ?? alerts.filter((a) => a.severity === 'error').length,
      warnings:
        (summary?.warnings as number) ?? alerts.filter((a) => a.severity === 'warning').length,
      checkedEntities: (summary?.checkedEntities as string[]) ?? [],
    },
  };
}

export const runCheck = internalAction({
  args: { documentId: v.id('documents') },
  handler: async (ctx, { documentId }): Promise<CheckResult> => {
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

    const canonContext = await buildCanonContext(
      { runQuery: ctx.runQuery as <T>(ref: unknown, args: unknown) => Promise<T> },
      doc.projectId
    );

    if (!canonContext.formattedContext.trim()) {
      return {
        alerts: [],
        summary: { totalIssues: 0, errors: 0, warnings: 0, checkedEntities: [] },
      };
    }

    const contentHash: string = await ctx.runQuery(internal.llm.utils.computeHash, {
      content: `${PROMPT_VERSION}:${canonContext.formattedContext}:${doc.content}`,
    });

    const cached = await ctx.runQuery(internal.llm.cache.checkCache, {
      inputHash: contentHash,
      promptVersion: PROMPT_VERSION,
    });

    if (cached) {
      return normalizeCheckResult(cached);
    }

    const result = await callCheckLLM(canonContext.formattedContext, doc.content, apiKey, model);

    await ctx.runMutation(internal.llm.cache.saveToCache, {
      inputHash: contentHash,
      promptVersion: PROMPT_VERSION,
      modelId: model,
      response: result,
    });

    if (result.alerts.length > 0) {
      await ctx.runMutation(internal.checks.createAlerts, {
        documentId,
        projectId: doc.projectId,
        checkResult: result,
        canonContext: canonContext.entities,
      });
    }

    return result;
  },
});

const checkResultValidator = v.object({
  alerts: v.array(
    v.object({
      type: v.union(v.literal('contradiction'), v.literal('timeline'), v.literal('ambiguity')),
      severity: v.union(v.literal('error'), v.literal('warning')),
      title: v.string(),
      description: v.string(),
      evidence: v.array(
        v.object({
          source: v.union(v.literal('canon'), v.literal('new_document')),
          quote: v.string(),
          entityName: v.optional(v.string()),
        })
      ),
      suggestedFix: v.optional(v.string()),
      affectedEntities: v.optional(v.array(v.string())),
    })
  ),
  summary: v.object({
    totalIssues: v.number(),
    errors: v.number(),
    warnings: v.number(),
    checkedEntities: v.array(v.string()),
  }),
});

const canonContextValidator = v.array(
  v.object({
    id: v.id('entities'),
    name: v.string(),
    type: v.string(),
    facts: v.array(
      v.object({
        id: v.id('facts'),
        predicate: v.string(),
        object: v.string(),
        evidence: v.string(),
        documentTitle: v.string(),
      })
    ),
  })
);

export const createAlerts = internalMutation({
  args: {
    documentId: v.id('documents'),
    projectId: v.id('projects'),
    checkResult: checkResultValidator,
    canonContext: canonContextValidator,
  },
  handler: async (ctx, { documentId, projectId, checkResult, canonContext }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc) return { alertsCreated: 0 };

    const entityNameToId = new Map<string, Id<'entities'>>();
    const factsByEntity = new Map<string, Array<{ id: Id<'facts'>; evidence: string }>>();

    for (const entity of canonContext) {
      entityNameToId.set(entity.name.toLowerCase(), entity.id);
      factsByEntity.set(
        entity.name.toLowerCase(),
        entity.facts.map((f) => ({ id: f.id, evidence: f.evidence }))
      );
    }

    const now = Date.now();
    let alertsCreated = 0;

    for (const alert of checkResult.alerts) {
      const entityIds: Id<'entities'>[] = [];
      const factIds: Id<'facts'>[] = [];
      const evidenceRecords: Array<{
        snippet: string;
        documentId: Id<'documents'>;
        documentTitle: string;
      }> = [];

      for (const entityName of alert.affectedEntities ?? []) {
        const entityId = entityNameToId.get(entityName.toLowerCase());
        if (entityId && !entityIds.includes(entityId)) {
          entityIds.push(entityId);

          const facts = factsByEntity.get(entityName.toLowerCase());
          if (facts) {
            for (const fact of facts) {
              if (!factIds.includes(fact.id)) {
                factIds.push(fact.id);
              }
            }
          }
        }
      }

      for (const ev of alert.evidence) {
        if (ev.entityName) {
          const entityId = entityNameToId.get(ev.entityName.toLowerCase());
          if (entityId && !entityIds.includes(entityId)) {
            entityIds.push(entityId);
          }
        }

        evidenceRecords.push({
          snippet: ev.quote,
          documentId,
          documentTitle: ev.source === 'new_document' ? doc.title : 'Canon',
        });
      }

      await ctx.db.insert('alerts', {
        projectId,
        documentId,
        factIds,
        entityIds,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        evidence: evidenceRecords,
        suggestedFix: alert.suggestedFix,
        status: 'open',
        createdAt: now,
      });

      alertsCreated++;
    }

    if (alertsCreated > 0) {
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
          stats: { ...stats, alertCount: stats.alertCount + alertsCreated },
        });
      }
    }

    return { alertsCreated };
  },
});

export const triggerCheck = action({
  args: { documentId: v.id('documents') },
  handler: async (ctx, { documentId }): Promise<CheckResult> => {
    const doc = await ctx.runQuery(api.documents.get, { id: documentId });
    if (!doc) {
      throw new Error('Document not found');
    }

    return await ctx.runAction(internal.checks.runCheck, { documentId });
  },
});
