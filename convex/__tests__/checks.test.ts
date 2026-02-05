import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { api, internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import schema from '../schema';

const getModules = () => import.meta.glob('../**/*.ts');

async function setupAuthenticatedUser(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      name: 'Test User',
      email: 'test@example.com',
      createdAt: Date.now(),
    });
  });

  return { userId };
}

async function setupProjectWithCanon(t: ReturnType<typeof convexTest>, userId: Id<'users'>) {
  return await t.run(async (ctx) => {
    const projectId = await ctx.db.insert('projects', {
      userId,
      name: 'Test Project',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stats: { documentCount: 1, entityCount: 2, factCount: 2, alertCount: 0, noteCount: 0 },
    });

    const documentId = await ctx.db.insert('documents', {
      projectId,
      title: 'Chapter 1',
      content: 'Marcus has blue eyes. He lives in the castle.',
      contentType: 'text',
      orderIndex: 0,
      wordCount: 9,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      processingStatus: 'completed',
    });

    const marcusId = await ctx.db.insert('entities', {
      projectId,
      name: 'Marcus',
      type: 'character',
      aliases: ['Lord Marcus'],
      status: 'confirmed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const castleId = await ctx.db.insert('entities', {
      projectId,
      name: 'The Castle',
      type: 'location',
      aliases: [],
      status: 'confirmed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const eyeFactId = await ctx.db.insert('facts', {
      projectId,
      entityId: marcusId,
      documentId,
      subject: 'Marcus',
      predicate: 'has',
      object: 'blue eyes',
      confidence: 1.0,
      evidenceSnippet: 'Marcus has blue eyes.',
      status: 'confirmed',
      createdAt: Date.now(),
    });

    const livesFactId = await ctx.db.insert('facts', {
      projectId,
      entityId: marcusId,
      documentId,
      subject: 'Marcus',
      predicate: 'lives in',
      object: 'the castle',
      confidence: 1.0,
      evidenceSnippet: 'He lives in the castle.',
      status: 'confirmed',
      createdAt: Date.now(),
    });

    return {
      projectId,
      documentId,
      marcusId,
      castleId,
      eyeFactId,
      livesFactId,
    };
  });
}

describe('checks', () => {
  describe('runCheck action', () => {
    it('returns cached alerts when canonical context exists', async () => {
      const t = convexTest(schema, getModules());
      const { userId } = await setupAuthenticatedUser(t);
      const asUser = t.withIdentity({ subject: userId });
      const { projectId, documentId } = await setupProjectWithCanon(t, userId);

      const canonContext = await t.query(internal.checks.getCanonContext, { projectId });
      expect(canonContext.formattedContext.trim()).not.toBe('');

      const doc = await asUser.query(api.documents.get, { id: documentId });
      expect(doc?.content).toBeDefined();

      const contentHash = await t.query(internal.llm.utils.computeHash, {
        content: `check-v1:${canonContext.formattedContext}:${doc?.content ?? ''}`,
      });

      const cachedResult = {
        alerts: [
          {
            type: 'contradiction' as const,
            severity: 'warning' as const,
            title: 'Cached continuity issue',
            description: 'from cache',
            evidence: [{ source: 'canon' as const, quote: 'cached quote' }],
          },
        ],
        summary: { totalIssues: 1, errors: 0, warnings: 1, checkedEntities: ['Marcus'] },
      };

      await t.mutation(internal.llm.cache.saveToCache, {
        inputHash: contentHash,
        promptVersion: 'check-v1',
        modelId: 'test-model',
        response: cachedResult,
      });

      const originalKey = process.env.OPENROUTER_API_KEY;
      const originalModel = process.env.MODEL;
      process.env.OPENROUTER_API_KEY = 'test-key';
      process.env.MODEL = 'test-model';

      try {
        const result = await asUser.action(api.checks.triggerCheck, { documentId });
        expect(result.alerts).toHaveLength(1);
        expect(result.alerts[0].title).toBe('Cached continuity issue');
      } finally {
        process.env.OPENROUTER_API_KEY = originalKey;
        process.env.MODEL = originalModel;
      }
    });
  });

  describe('createAlerts mutation', () => {
    it('creates alerts from check result', async () => {
      const t = convexTest(schema, getModules());
      const { userId } = await setupAuthenticatedUser(t);
      const { projectId, documentId, marcusId, eyeFactId } = await setupProjectWithCanon(t, userId);

      const checkResult = {
        alerts: [
          {
            type: 'contradiction' as const,
            severity: 'error' as const,
            title: 'Eye color conflict',
            description: "Marcus's eye color changed from blue to brown",
            evidence: [
              { source: 'canon' as const, quote: 'Marcus has blue eyes.', entityName: 'Marcus' },
              { source: 'new_document' as const, quote: 'Marcus has brown eyes.' },
            ],
            suggestedFix: 'Update one of the references to match.',
            affectedEntities: ['Marcus'],
          },
        ],
        summary: { totalIssues: 1, errors: 1, warnings: 0, checkedEntities: ['Marcus'] },
      };

      const canonContext = [
        {
          id: marcusId,
          name: 'Marcus',
          type: 'character',
          facts: [
            {
              id: eyeFactId,
              predicate: 'has',
              object: 'blue eyes',
              evidence: 'Marcus has blue eyes.',
              documentTitle: 'Chapter 1',
            },
          ],
        },
      ];

      const result = await t.mutation(internal.checks.createAlerts, {
        documentId,
        projectId,
        checkResult,
        canonContext,
      });

      expect(result.alertsCreated).toBe(1);

      const alerts = await t.run(async (ctx) => {
        return await ctx.db
          .query('alerts')
          .withIndex('by_project', (q) => q.eq('projectId', projectId))
          .collect();
      });

      expect(alerts).toHaveLength(1);
      expect(alerts[0].title).toBe('Eye color conflict');
      expect(alerts[0].type).toBe('contradiction');
      expect(alerts[0].severity).toBe('error');
      expect(alerts[0].status).toBe('open');
      expect(alerts[0].entityIds).toContain(marcusId);
      expect(alerts[0].factIds).toContain(eyeFactId);
    });

    it('links multiple entities from affectedEntities', async () => {
      const t = convexTest(schema, getModules());
      const { userId } = await setupAuthenticatedUser(t);
      const { projectId, documentId, marcusId, castleId, eyeFactId, livesFactId } =
        await setupProjectWithCanon(t, userId);

      const checkResult = {
        alerts: [
          {
            type: 'contradiction' as const,
            severity: 'warning' as const,
            title: 'Location conflict',
            description: 'Marcus moved locations',
            evidence: [{ source: 'new_document' as const, quote: 'Marcus left the castle.' }],
            affectedEntities: ['Marcus', 'The Castle'],
          },
        ],
        summary: {
          totalIssues: 1,
          errors: 0,
          warnings: 1,
          checkedEntities: ['Marcus', 'The Castle'],
        },
      };

      const canonContext = [
        {
          id: marcusId,
          name: 'Marcus',
          type: 'character',
          facts: [
            {
              id: eyeFactId,
              predicate: 'has',
              object: 'blue eyes',
              evidence: 'Marcus has blue eyes.',
              documentTitle: 'Chapter 1',
            },
            {
              id: livesFactId,
              predicate: 'lives in',
              object: 'the castle',
              evidence: 'He lives in the castle.',
              documentTitle: 'Chapter 1',
            },
          ],
        },
        {
          id: castleId,
          name: 'The Castle',
          type: 'location',
          facts: [],
        },
      ];

      await t.mutation(internal.checks.createAlerts, {
        documentId,
        projectId,
        checkResult,
        canonContext,
      });

      const alerts = await t.run(async (ctx) => {
        return await ctx.db
          .query('alerts')
          .withIndex('by_project', (q) => q.eq('projectId', projectId))
          .collect();
      });

      expect(alerts).toHaveLength(1);
      expect(alerts[0].entityIds).toHaveLength(2);
      expect(alerts[0].entityIds).toContain(marcusId);
      expect(alerts[0].entityIds).toContain(castleId);
    });

    it('extracts entity from evidence entityName', async () => {
      const t = convexTest(schema, getModules());
      const { userId } = await setupAuthenticatedUser(t);
      const { projectId, documentId, marcusId, eyeFactId } = await setupProjectWithCanon(t, userId);

      const checkResult = {
        alerts: [
          {
            type: 'ambiguity' as const,
            severity: 'warning' as const,
            title: 'Ambiguous reference',
            description: 'Unclear description',
            evidence: [{ source: 'canon' as const, quote: 'Some quote', entityName: 'Marcus' }],
          },
        ],
        summary: { totalIssues: 1, errors: 0, warnings: 1, checkedEntities: [] },
      };

      const canonContext = [
        {
          id: marcusId,
          name: 'Marcus',
          type: 'character',
          facts: [
            {
              id: eyeFactId,
              predicate: 'has',
              object: 'blue eyes',
              evidence: 'Marcus has blue eyes.',
              documentTitle: 'Chapter 1',
            },
          ],
        },
      ];

      await t.mutation(internal.checks.createAlerts, {
        documentId,
        projectId,
        checkResult,
        canonContext,
      });

      const alerts = await t.run(async (ctx) => {
        return await ctx.db
          .query('alerts')
          .withIndex('by_project', (q) => q.eq('projectId', projectId))
          .collect();
      });

      expect(alerts).toHaveLength(1);
      expect(alerts[0].entityIds).toContain(marcusId);
    });

    it('creates multiple alerts from check result', async () => {
      const t = convexTest(schema, getModules());
      const { userId } = await setupAuthenticatedUser(t);
      const { projectId, documentId, marcusId, eyeFactId } = await setupProjectWithCanon(t, userId);

      const checkResult = {
        alerts: [
          {
            type: 'contradiction' as const,
            severity: 'error' as const,
            title: 'Issue 1',
            description: 'First conflict',
            evidence: [{ source: 'canon' as const, quote: 'Quote 1' }],
          },
          {
            type: 'timeline' as const,
            severity: 'warning' as const,
            title: 'Issue 2',
            description: 'Timeline problem',
            evidence: [{ source: 'new_document' as const, quote: 'Quote 2' }],
          },
          {
            type: 'ambiguity' as const,
            severity: 'warning' as const,
            title: 'Issue 3',
            description: 'Unclear reference',
            evidence: [{ source: 'canon' as const, quote: 'Quote 3' }],
          },
        ],
        summary: { totalIssues: 3, errors: 1, warnings: 2, checkedEntities: [] },
      };

      const canonContext = [
        {
          id: marcusId,
          name: 'Marcus',
          type: 'character',
          facts: [
            {
              id: eyeFactId,
              predicate: 'has',
              object: 'blue eyes',
              evidence: 'Marcus has blue eyes.',
              documentTitle: 'Chapter 1',
            },
          ],
        },
      ];

      const result = await t.mutation(internal.checks.createAlerts, {
        documentId,
        projectId,
        checkResult,
        canonContext,
      });

      expect(result.alertsCreated).toBe(3);

      const alerts = await t.run(async (ctx) => {
        return await ctx.db
          .query('alerts')
          .withIndex('by_project', (q) => q.eq('projectId', projectId))
          .collect();
      });

      expect(alerts).toHaveLength(3);
      expect(alerts.map((a) => a.type)).toContain('contradiction');
      expect(alerts.map((a) => a.type)).toContain('timeline');
      expect(alerts.map((a) => a.type)).toContain('ambiguity');
    });

    it('updates project alertCount stat', async () => {
      const t = convexTest(schema, getModules());
      const { userId } = await setupAuthenticatedUser(t);
      const { projectId, documentId, marcusId, eyeFactId } = await setupProjectWithCanon(t, userId);

      const checkResult = {
        alerts: [
          {
            type: 'contradiction' as const,
            severity: 'error' as const,
            title: 'Issue 1',
            description: 'Conflict',
            evidence: [{ source: 'canon' as const, quote: 'Quote' }],
          },
          {
            type: 'timeline' as const,
            severity: 'warning' as const,
            title: 'Issue 2',
            description: 'Warning',
            evidence: [{ source: 'new_document' as const, quote: 'Quote 2' }],
          },
        ],
        summary: { totalIssues: 2, errors: 1, warnings: 1, checkedEntities: [] },
      };

      const canonContext = [
        {
          id: marcusId,
          name: 'Marcus',
          type: 'character',
          facts: [
            {
              id: eyeFactId,
              predicate: 'has',
              object: 'blue eyes',
              evidence: 'Marcus has blue eyes.',
              documentTitle: 'Chapter 1',
            },
          ],
        },
      ];

      await t.mutation(internal.checks.createAlerts, {
        documentId,
        projectId,
        checkResult,
        canonContext,
      });

      const project = await t.run(async (ctx) => ctx.db.get(projectId));
      expect(project?.stats?.alertCount).toBe(2);
    });

    it('handles empty alerts array', async () => {
      const t = convexTest(schema, getModules());
      const { userId } = await setupAuthenticatedUser(t);
      const { projectId, documentId, marcusId, eyeFactId } = await setupProjectWithCanon(t, userId);

      const checkResult = {
        alerts: [],
        summary: { totalIssues: 0, errors: 0, warnings: 0, checkedEntities: ['Marcus'] },
      };

      const canonContext = [
        {
          id: marcusId,
          name: 'Marcus',
          type: 'character',
          facts: [
            {
              id: eyeFactId,
              predicate: 'has',
              object: 'blue eyes',
              evidence: 'Marcus has blue eyes.',
              documentTitle: 'Chapter 1',
            },
          ],
        },
      ];

      const result = await t.mutation(internal.checks.createAlerts, {
        documentId,
        projectId,
        checkResult,
        canonContext,
      });

      expect(result.alertsCreated).toBe(0);

      const project = await t.run(async (ctx) => ctx.db.get(projectId));
      expect(project?.stats?.alertCount).toBe(0);
    });

    it('handles deleted document gracefully', async () => {
      const t = convexTest(schema, getModules());
      const { userId } = await setupAuthenticatedUser(t);
      const { projectId, documentId, marcusId, eyeFactId } = await setupProjectWithCanon(t, userId);

      await t.run(async (ctx) => {
        await ctx.db.delete(documentId);
      });

      const checkResult = {
        alerts: [
          {
            type: 'contradiction' as const,
            severity: 'error' as const,
            title: 'Issue',
            description: 'Conflict',
            evidence: [{ source: 'canon' as const, quote: 'Quote' }],
          },
        ],
        summary: { totalIssues: 1, errors: 1, warnings: 0, checkedEntities: [] },
      };

      const canonContext = [
        {
          id: marcusId,
          name: 'Marcus',
          type: 'character',
          facts: [
            {
              id: eyeFactId,
              predicate: 'has',
              object: 'blue eyes',
              evidence: 'text',
              documentTitle: 'Chapter 1',
            },
          ],
        },
      ];

      const result = await t.mutation(internal.checks.createAlerts, {
        documentId,
        projectId,
        checkResult,
        canonContext,
      });

      expect(result.alertsCreated).toBe(0);
    });

    it('stores evidence records with correct document titles', async () => {
      const t = convexTest(schema, getModules());
      const { userId } = await setupAuthenticatedUser(t);
      const { projectId, documentId, marcusId, eyeFactId } = await setupProjectWithCanon(t, userId);

      const checkResult = {
        alerts: [
          {
            type: 'contradiction' as const,
            severity: 'error' as const,
            title: 'Conflict',
            description: 'Desc',
            evidence: [
              { source: 'canon' as const, quote: 'Canon quote' },
              { source: 'new_document' as const, quote: 'New doc quote' },
            ],
          },
        ],
        summary: { totalIssues: 1, errors: 1, warnings: 0, checkedEntities: [] },
      };

      const canonContext = [
        {
          id: marcusId,
          name: 'Marcus',
          type: 'character',
          facts: [
            {
              id: eyeFactId,
              predicate: 'has',
              object: 'blue eyes',
              evidence: 'text',
              documentTitle: 'Chapter 1',
            },
          ],
        },
      ];

      await t.mutation(internal.checks.createAlerts, {
        documentId,
        projectId,
        checkResult,
        canonContext,
      });

      const alerts = await t.run(async (ctx) => {
        return await ctx.db
          .query('alerts')
          .withIndex('by_project', (q) => q.eq('projectId', projectId))
          .collect();
      });

      expect(alerts[0].evidence).toHaveLength(2);
      expect(alerts[0].evidence[0].documentTitle).toBe('Canon');
      expect(alerts[0].evidence[1].documentTitle).toBe('Chapter 1');
    });

    it('handles case-insensitive entity name matching', async () => {
      const t = convexTest(schema, getModules());
      const { userId } = await setupAuthenticatedUser(t);
      const { projectId, documentId, marcusId, eyeFactId } = await setupProjectWithCanon(t, userId);

      const checkResult = {
        alerts: [
          {
            type: 'contradiction' as const,
            severity: 'error' as const,
            title: 'Issue',
            description: 'Desc',
            evidence: [{ source: 'canon' as const, quote: 'Quote' }],
            affectedEntities: ['MARCUS', 'marcus', 'Marcus'],
          },
        ],
        summary: { totalIssues: 1, errors: 1, warnings: 0, checkedEntities: [] },
      };

      const canonContext = [
        {
          id: marcusId,
          name: 'Marcus',
          type: 'character',
          facts: [
            {
              id: eyeFactId,
              predicate: 'has',
              object: 'blue eyes',
              evidence: 'text',
              documentTitle: 'Chapter 1',
            },
          ],
        },
      ];

      await t.mutation(internal.checks.createAlerts, {
        documentId,
        projectId,
        checkResult,
        canonContext,
      });

      const alerts = await t.run(async (ctx) => {
        return await ctx.db
          .query('alerts')
          .withIndex('by_project', (q) => q.eq('projectId', projectId))
          .collect();
      });

      expect(alerts[0].entityIds).toHaveLength(1);
      expect(alerts[0].entityIds).toContain(marcusId);
    });

    it('avoids duplicate factIds', async () => {
      const t = convexTest(schema, getModules());
      const { userId } = await setupAuthenticatedUser(t);
      const { projectId, documentId, marcusId, eyeFactId } = await setupProjectWithCanon(t, userId);

      const checkResult = {
        alerts: [
          {
            type: 'contradiction' as const,
            severity: 'error' as const,
            title: 'Issue',
            description: 'Desc',
            evidence: [
              { source: 'canon' as const, quote: 'Quote 1', entityName: 'Marcus' },
              { source: 'canon' as const, quote: 'Quote 2', entityName: 'Marcus' },
            ],
            affectedEntities: ['Marcus'],
          },
        ],
        summary: { totalIssues: 1, errors: 1, warnings: 0, checkedEntities: [] },
      };

      const canonContext = [
        {
          id: marcusId,
          name: 'Marcus',
          type: 'character',
          facts: [
            {
              id: eyeFactId,
              predicate: 'has',
              object: 'blue eyes',
              evidence: 'text',
              documentTitle: 'Chapter 1',
            },
          ],
        },
      ];

      await t.mutation(internal.checks.createAlerts, {
        documentId,
        projectId,
        checkResult,
        canonContext,
      });

      const alerts = await t.run(async (ctx) => {
        return await ctx.db
          .query('alerts')
          .withIndex('by_project', (q) => q.eq('projectId', projectId))
          .collect();
      });

      const factIdSet = new Set(alerts[0].factIds);
      expect(alerts[0].factIds.length).toBe(factIdSet.size);
    });
  });
});
