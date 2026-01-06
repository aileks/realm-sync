import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { api } from '../_generated/api';
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

  const asUser = t.withIdentity({ subject: userId });
  return { userId, asUser };
}

async function setupProjectWithAlert(t: ReturnType<typeof convexTest>, userId: Id<'users'>) {
  return await t.run(async (ctx) => {
    const projectId = await ctx.db.insert('projects', {
      userId,
      name: 'Test Project',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stats: { documentCount: 1, entityCount: 1, factCount: 1, alertCount: 1, noteCount: 0 },
    });

    const documentId = await ctx.db.insert('documents', {
      projectId,
      title: 'Test Document',
      content: 'Marcus has blue eyes.',
      contentType: 'text',
      orderIndex: 0,
      wordCount: 4,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      processingStatus: 'completed',
    });

    const entityId = await ctx.db.insert('entities', {
      projectId,
      name: 'Marcus',
      type: 'character',
      aliases: [],
      status: 'confirmed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const factId = await ctx.db.insert('facts', {
      projectId,
      entityId,
      documentId,
      subject: 'Marcus',
      predicate: 'has',
      object: 'blue eyes',
      confidence: 1.0,
      evidenceSnippet: 'Marcus has blue eyes.',
      status: 'confirmed',
      createdAt: Date.now(),
    });

    const alertId = await ctx.db.insert('alerts', {
      projectId,
      documentId,
      factIds: [factId],
      entityIds: [entityId],
      type: 'contradiction',
      severity: 'error',
      title: 'Eye color conflict',
      description: "Marcus's eye color changed from blue to brown",
      evidence: [{ snippet: 'Marcus has blue eyes.', documentId, documentTitle: 'Test Document' }],
      suggestedFix: 'Update one of the references to match.',
      status: 'open',
      createdAt: Date.now(),
    });

    return { projectId, documentId, entityId, factId, alertId };
  });
}

describe('alerts', () => {
  describe('listByProject query', () => {
    it('returns all alerts for project', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId } = await setupProjectWithAlert(t, userId);

      const alerts = await asUser.query(api.alerts.listByProject, { projectId });
      expect(alerts).toHaveLength(1);
      expect(alerts[0].title).toBe('Eye color conflict');
    });

    it('filters by status', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, documentId, entityId, factId } = await setupProjectWithAlert(t, userId);

      await t.run(async (ctx) => {
        await ctx.db.insert('alerts', {
          projectId,
          documentId,
          factIds: [factId],
          entityIds: [entityId],
          type: 'timeline',
          severity: 'warning',
          title: 'Resolved alert',
          description: 'This was resolved',
          evidence: [],
          status: 'resolved',
          createdAt: Date.now(),
          resolvedAt: Date.now(),
        });
      });

      const openAlerts = await asUser.query(api.alerts.listByProject, {
        projectId,
        status: 'open',
      });
      expect(openAlerts).toHaveLength(1);
      expect(openAlerts[0].title).toBe('Eye color conflict');

      const resolvedAlerts = await asUser.query(api.alerts.listByProject, {
        projectId,
        status: 'resolved',
      });
      expect(resolvedAlerts).toHaveLength(1);
      expect(resolvedAlerts[0].title).toBe('Resolved alert');
    });

    it('filters by type', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, documentId, entityId, factId } = await setupProjectWithAlert(t, userId);

      await t.run(async (ctx) => {
        await ctx.db.insert('alerts', {
          projectId,
          documentId,
          factIds: [factId],
          entityIds: [entityId],
          type: 'timeline',
          severity: 'warning',
          title: 'Timeline issue',
          description: 'Events out of order',
          evidence: [],
          status: 'open',
          createdAt: Date.now(),
        });
      });

      const contradictions = await asUser.query(api.alerts.listByProject, {
        projectId,
        type: 'contradiction',
      });
      expect(contradictions).toHaveLength(1);

      const timelineAlerts = await asUser.query(api.alerts.listByProject, {
        projectId,
        type: 'timeline',
      });
      expect(timelineAlerts).toHaveLength(1);
    });

    it('filters by severity', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, documentId, entityId, factId } = await setupProjectWithAlert(t, userId);

      await t.run(async (ctx) => {
        await ctx.db.insert('alerts', {
          projectId,
          documentId,
          factIds: [factId],
          entityIds: [entityId],
          type: 'ambiguity',
          severity: 'warning',
          title: 'Warning alert',
          description: 'Minor issue',
          evidence: [],
          status: 'open',
          createdAt: Date.now(),
        });
      });

      const errors = await asUser.query(api.alerts.listByProject, {
        projectId,
        severity: 'error',
      });
      expect(errors).toHaveLength(1);

      const warnings = await asUser.query(api.alerts.listByProject, {
        projectId,
        severity: 'warning',
      });
      expect(warnings).toHaveLength(1);
    });

    it('returns empty array when not project owner', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        const otherUserId = await ctx.db.insert('users', {
          name: 'Other',
          email: 'other@test.com',
          createdAt: Date.now(),
        });
        return await ctx.db.insert('projects', {
          userId: otherUserId,
          name: 'Other Project',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const alerts = await asUser.query(api.alerts.listByProject, { projectId });
      expect(alerts).toEqual([]);
    });
  });

  describe('listOpenByUser query', () => {
    it('returns open alerts across projects with totals', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const { projectId } = await setupProjectWithAlert(t, userId);

      const secondProjectId = await t.run(async (ctx) => {
        const project = await ctx.db.insert('projects', {
          userId,
          name: 'Second Project',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const documentId = await ctx.db.insert('documents', {
          projectId: project,
          title: 'Other Document',
          content: 'Text',
          contentType: 'text',
          orderIndex: 0,
          wordCount: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          processingStatus: 'completed',
        });

        await ctx.db.insert('alerts', {
          projectId: project,
          documentId,
          factIds: [],
          entityIds: [],
          type: 'timeline',
          severity: 'warning',
          title: 'Timeline mismatch',
          description: 'Out of order events',
          evidence: [],
          status: 'open',
          createdAt: Date.now(),
        });

        await ctx.db.insert('alerts', {
          projectId: project,
          documentId,
          factIds: [],
          entityIds: [],
          type: 'ambiguity',
          severity: 'warning',
          title: 'Resolved warning',
          description: 'Ignore',
          evidence: [],
          status: 'resolved',
          createdAt: Date.now(),
          resolvedAt: Date.now(),
        });

        return project;
      });

      const result = await asUser.query(api.alerts.listOpenByUser, { limit: 1 });

      expect(result.total).toBe(2);
      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].projectName).toBeDefined();
      expect([projectId, secondProjectId]).toContain(result.alerts[0].alert.projectId);
    });

    it('returns empty results for unauthenticated users', async () => {
      const t = convexTest(schema, getModules());

      const result = await t.query(api.alerts.listOpenByUser, {});

      expect(result).toEqual({ total: 0, alerts: [] });
    });
  });

  describe('listByDocument query', () => {
    it('returns alerts for specific document', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { documentId } = await setupProjectWithAlert(t, userId);

      const alerts = await asUser.query(api.alerts.listByDocument, { documentId });
      expect(alerts).toHaveLength(1);
    });

    it('returns empty array for document without alerts', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId } = await setupProjectWithAlert(t, userId);

      const otherDocId = await t.run(async (ctx) => {
        return await ctx.db.insert('documents', {
          projectId,
          title: 'Other Document',
          content: 'No alerts here',
          contentType: 'text',
          orderIndex: 1,
          wordCount: 3,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          processingStatus: 'completed',
        });
      });

      const alerts = await asUser.query(api.alerts.listByDocument, { documentId: otherDocId });
      expect(alerts).toEqual([]);
    });
  });

  describe('get query', () => {
    it('returns alert by id', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { alertId } = await setupProjectWithAlert(t, userId);

      const alert = await asUser.query(api.alerts.get, { id: alertId });
      expect(alert).not.toBeNull();
      expect(alert?.title).toBe('Eye color conflict');
    });

    it('returns null for non-existent alert', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { alertId } = await setupProjectWithAlert(t, userId);

      await t.run(async (ctx) => ctx.db.delete(alertId));

      const alert = await asUser.query(api.alerts.get, { id: alertId });
      expect(alert).toBeNull();
    });

    it('returns null when not project owner', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const alertId = await t.run(async (ctx) => {
        const otherUserId = await ctx.db.insert('users', {
          name: 'Other',
          email: 'other@test.com',
          createdAt: Date.now(),
        });
        const projectId = await ctx.db.insert('projects', {
          userId: otherUserId,
          name: 'Other',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        const documentId = await ctx.db.insert('documents', {
          projectId,
          title: 'Doc',
          contentType: 'text',
          orderIndex: 0,
          wordCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          processingStatus: 'completed',
        });
        return await ctx.db.insert('alerts', {
          projectId,
          documentId,
          factIds: [],
          entityIds: [],
          type: 'contradiction',
          severity: 'error',
          title: 'Other alert',
          description: 'desc',
          evidence: [],
          status: 'open',
          createdAt: Date.now(),
        });
      });

      const alert = await asUser.query(api.alerts.get, { id: alertId });
      expect(alert).toBeNull();
    });
  });

  describe('countByProject query', () => {
    it('returns counts by status', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, documentId, entityId, factId } = await setupProjectWithAlert(t, userId);

      await t.run(async (ctx) => {
        await ctx.db.insert('alerts', {
          projectId,
          documentId,
          factIds: [factId],
          entityIds: [entityId],
          type: 'timeline',
          severity: 'warning',
          title: 'Resolved',
          description: 'desc',
          evidence: [],
          status: 'resolved',
          createdAt: Date.now(),
        });
        await ctx.db.insert('alerts', {
          projectId,
          documentId,
          factIds: [factId],
          entityIds: [entityId],
          type: 'ambiguity',
          severity: 'warning',
          title: 'Dismissed',
          description: 'desc',
          evidence: [],
          status: 'dismissed',
          createdAt: Date.now(),
        });
      });

      const counts = await asUser.query(api.alerts.countByProject, { projectId });
      expect(counts.open).toBe(1);
      expect(counts.resolved).toBe(1);
      expect(counts.dismissed).toBe(1);
      expect(counts.total).toBe(3);
    });
  });

  describe('resolve mutation', () => {
    it('changes status to resolved', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { alertId } = await setupProjectWithAlert(t, userId);

      await asUser.mutation(api.alerts.resolve, { id: alertId });

      const alert = await t.run(async (ctx) => ctx.db.get(alertId));
      expect(alert?.status).toBe('resolved');
      expect(alert?.resolvedAt).toBeDefined();
    });

    it('stores resolution notes', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { alertId } = await setupProjectWithAlert(t, userId);

      await asUser.mutation(api.alerts.resolve, {
        id: alertId,
        resolutionNotes: 'Fixed by updating document',
      });

      const alert = await t.run(async (ctx) => ctx.db.get(alertId));
      expect(alert?.resolutionNotes).toBe('Fixed by updating document');
    });

    it('decrements project alertCount', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, alertId } = await setupProjectWithAlert(t, userId);

      await asUser.mutation(api.alerts.resolve, { id: alertId });

      const project = await t.run(async (ctx) => ctx.db.get(projectId));
      expect(project?.stats?.alertCount).toBe(0);
    });

    it('does not decrement if already resolved', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, alertId } = await setupProjectWithAlert(t, userId);

      await t.run(async (ctx) => {
        await ctx.db.patch(alertId, { status: 'resolved', resolvedAt: Date.now() });
        const project = await ctx.db.get(projectId);
        if (project) {
          await ctx.db.patch(projectId, {
            stats: { ...project.stats!, alertCount: 0, noteCount: 0 },
          });
        }
      });

      await asUser.mutation(api.alerts.resolve, { id: alertId });

      const project = await t.run(async (ctx) => ctx.db.get(projectId));
      expect(project?.stats?.alertCount).toBe(0);
    });

    it('throws when not authenticated', async () => {
      const t = convexTest(schema, getModules());
      const { userId } = await setupAuthenticatedUser(t);
      const { alertId } = await setupProjectWithAlert(t, userId);

      await expect(t.mutation(api.alerts.resolve, { id: alertId })).rejects.toThrow(
        /unauthorized/i
      );
    });
  });

  describe('resolveWithCanonUpdate mutation', () => {
    it('updates fact and document content', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { alertId, factId, documentId } = await setupProjectWithAlert(t, userId);

      await asUser.mutation(api.alerts.resolveWithCanonUpdate, {
        id: alertId,
        factId,
        newValue: 'brown eyes',
      });

      const fact = await t.run(async (ctx) => ctx.db.get(factId));
      const doc = await t.run(async (ctx) => ctx.db.get(documentId));
      const alert = await t.run(async (ctx) => ctx.db.get(alertId));

      expect(fact?.object).toBe('brown eyes');
      expect(fact?.evidenceSnippet).toBe('Marcus has brown eyes.');
      expect(doc?.content).toBe('Marcus has brown eyes.');
      expect(doc?.processingStatus).toBe('pending');
      expect(alert?.status).toBe('resolved');
    });
  });

  describe('dismiss mutation', () => {
    it('changes status to dismissed', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { alertId } = await setupProjectWithAlert(t, userId);

      await asUser.mutation(api.alerts.dismiss, { id: alertId });

      const alert = await t.run(async (ctx) => ctx.db.get(alertId));
      expect(alert?.status).toBe('dismissed');
    });

    it('decrements project alertCount', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, alertId } = await setupProjectWithAlert(t, userId);

      await asUser.mutation(api.alerts.dismiss, { id: alertId });

      const project = await t.run(async (ctx) => ctx.db.get(projectId));
      expect(project?.stats?.alertCount).toBe(0);
    });
  });

  describe('reopen mutation', () => {
    it('changes status back to open', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { alertId } = await setupProjectWithAlert(t, userId);

      await t.run(async (ctx) => {
        await ctx.db.patch(alertId, { status: 'resolved', resolvedAt: Date.now() });
      });

      await asUser.mutation(api.alerts.reopen, { id: alertId });

      const alert = await t.run(async (ctx) => ctx.db.get(alertId));
      expect(alert?.status).toBe('open');
      expect(alert?.resolvedAt).toBeUndefined();
    });

    it('increments project alertCount', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, alertId } = await setupProjectWithAlert(t, userId);

      await t.run(async (ctx) => {
        await ctx.db.patch(alertId, { status: 'resolved' });
        const project = await ctx.db.get(projectId);
        if (project) {
          await ctx.db.patch(projectId, {
            stats: { ...project.stats!, alertCount: 0, noteCount: 0 },
          });
        }
      });

      await asUser.mutation(api.alerts.reopen, { id: alertId });

      const project = await t.run(async (ctx) => ctx.db.get(projectId));
      expect(project?.stats?.alertCount).toBe(1);
    });
  });

  describe('remove mutation', () => {
    it('deletes alert', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { alertId } = await setupProjectWithAlert(t, userId);

      await asUser.mutation(api.alerts.remove, { id: alertId });

      const alert = await t.run(async (ctx) => ctx.db.get(alertId));
      expect(alert).toBeNull();
    });

    it('decrements project alertCount when open', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, alertId } = await setupProjectWithAlert(t, userId);

      await asUser.mutation(api.alerts.remove, { id: alertId });

      const project = await t.run(async (ctx) => ctx.db.get(projectId));
      expect(project?.stats?.alertCount).toBe(0);
    });

    it('does not decrement when already resolved', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, alertId } = await setupProjectWithAlert(t, userId);

      await t.run(async (ctx) => {
        await ctx.db.patch(alertId, { status: 'resolved' });
        const project = await ctx.db.get(projectId);
        if (project) {
          await ctx.db.patch(projectId, {
            stats: { ...project.stats!, alertCount: 0, noteCount: 0 },
          });
        }
      });

      await asUser.mutation(api.alerts.remove, { id: alertId });

      const project = await t.run(async (ctx) => ctx.db.get(projectId));
      expect(project?.stats?.alertCount).toBe(0);
    });
  });

  describe('resolveAll mutation', () => {
    it('resolves all open alerts', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, documentId, entityId, factId } = await setupProjectWithAlert(t, userId);

      await t.run(async (ctx) => {
        await ctx.db.insert('alerts', {
          projectId,
          documentId,
          factIds: [factId],
          entityIds: [entityId],
          type: 'timeline',
          severity: 'warning',
          title: 'Second open alert',
          description: 'desc',
          evidence: [],
          status: 'open',
          createdAt: Date.now(),
        });
      });

      const count = await asUser.mutation(api.alerts.resolveAll, { projectId });
      expect(count).toBe(2);

      const alerts = await t.run(async (ctx) => {
        return await ctx.db
          .query('alerts')
          .withIndex('by_project', (q) => q.eq('projectId', projectId))
          .collect();
      });
      expect(alerts.every((a) => a.status === 'resolved')).toBe(true);
    });

    it('sets alertCount to 0', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId } = await setupProjectWithAlert(t, userId);

      await asUser.mutation(api.alerts.resolveAll, { projectId });

      const project = await t.run(async (ctx) => ctx.db.get(projectId));
      expect(project?.stats?.alertCount).toBe(0);
    });
  });

  describe('dismissAll mutation', () => {
    it('dismisses all open alerts', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, documentId, entityId, factId } = await setupProjectWithAlert(t, userId);

      await t.run(async (ctx) => {
        await ctx.db.insert('alerts', {
          projectId,
          documentId,
          factIds: [factId],
          entityIds: [entityId],
          type: 'ambiguity',
          severity: 'warning',
          title: 'Second open alert',
          description: 'desc',
          evidence: [],
          status: 'open',
          createdAt: Date.now(),
        });
      });

      const count = await asUser.mutation(api.alerts.dismissAll, { projectId });
      expect(count).toBe(2);

      const alerts = await t.run(async (ctx) => {
        return await ctx.db
          .query('alerts')
          .withIndex('by_project', (q) => q.eq('projectId', projectId))
          .collect();
      });
      expect(alerts.every((a) => a.status === 'dismissed')).toBe(true);
    });
  });
});
