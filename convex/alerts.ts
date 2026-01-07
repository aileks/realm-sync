import { v } from 'convex/values';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { getAuthUserId, requireAuth } from './lib/auth';
import { ok, err, authError, notFoundError } from './lib/errors';
import type { AppError, Result } from './lib/errors';
import { unwrapOrThrow } from './lib/result';

const alertTypeValidator = v.union(
  v.literal('contradiction'),
  v.literal('timeline'),
  v.literal('ambiguity')
);

const alertSeverityValidator = v.union(v.literal('error'), v.literal('warning'));

const alertStatusValidator = v.union(
  v.literal('open'),
  v.literal('resolved'),
  v.literal('dismissed')
);

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function verifyProjectOwnership(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<'projects'>
): Promise<boolean> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return false;

  const project = await ctx.db.get(projectId);
  if (!project) return false;

  return project.userId === userId;
}

async function verifyAlertAccess(
  ctx: MutationCtx,
  alertId: Id<'alerts'>,
  userId: Id<'users'>
): Promise<Result<Doc<'alerts'>, AppError>> {
  const alert = await ctx.db.get(alertId);
  if (!alert) return err(notFoundError('alert', alertId));

  const project = await ctx.db.get(alert.projectId);
  if (!project || project.userId !== userId) {
    return err(authError('UNAUTHORIZED', 'Unauthorized'));
  }

  return ok(alert);
}

export const listByProject = query({
  args: {
    projectId: v.id('projects'),
    status: v.optional(alertStatusValidator),
    type: v.optional(alertTypeValidator),
    severity: v.optional(alertSeverityValidator),
  },
  handler: async (ctx, { projectId, status, type, severity }) => {
    const isOwner = await verifyProjectOwnership(ctx, projectId);
    if (!isOwner) return [];

    let alerts;

    if (status) {
      alerts = await ctx.db
        .query('alerts')
        .withIndex('by_project', (q) => q.eq('projectId', projectId).eq('status', status))
        .collect();
    } else {
      alerts = await ctx.db
        .query('alerts')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect();
    }

    if (type) {
      alerts = alerts.filter((a) => a.type === type);
    }
    if (severity) {
      alerts = alerts.filter((a) => a.severity === severity);
    }

    return alerts.toSorted((a, b) => b.createdAt - a.createdAt);
  },
});

export const listOpenByUser = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { total: 0, alerts: [] };

    const projects = await ctx.db
      .query('projects')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    const projectNames = new Map(projects.map((project) => [project._id, project.name]));
    const openAlerts: Doc<'alerts'>[] = [];

    for (const project of projects) {
      const alerts = await ctx.db
        .query('alerts')
        .withIndex('by_project', (q) => q.eq('projectId', project._id).eq('status', 'open'))
        .collect();
      openAlerts.push(...alerts);
    }

    const sortedAlerts = openAlerts.toSorted((a, b) => b.createdAt - a.createdAt);
    const total = sortedAlerts.length;
    const limited = limit ? sortedAlerts.slice(0, limit) : sortedAlerts;

    return {
      total,
      alerts: limited.map((alert) => ({
        alert,
        projectName: projectNames.get(alert.projectId) ?? 'Untitled Project',
      })),
    };
  },
});

export const listByDocument = query({
  args: {
    documentId: v.id('documents'),
  },
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc) return [];

    const isOwner = await verifyProjectOwnership(ctx, doc.projectId);
    if (!isOwner) return [];

    return await ctx.db
      .query('alerts')
      .withIndex('by_document', (q) => q.eq('documentId', documentId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id('alerts') },
  handler: async (ctx, { id }) => {
    const alert = await ctx.db.get(id);
    if (!alert) return null;

    const isOwner = await verifyProjectOwnership(ctx, alert.projectId);
    if (!isOwner) return null;

    return alert;
  },
});

export const getWithDetails = query({
  args: { id: v.id('alerts') },
  handler: async (ctx, { id }) => {
    const alert = await ctx.db.get(id);
    if (!alert) return null;

    const isOwner = await verifyProjectOwnership(ctx, alert.projectId);
    if (!isOwner) return null;

    const entities = await Promise.all(
      alert.entityIds.map(async (entityId) => {
        const entity = await ctx.db.get(entityId);
        return entity ? { _id: entity._id, name: entity.name, type: entity.type } : null;
      })
    );

    const facts = await Promise.all(
      alert.factIds.map(async (factId) => {
        const fact = await ctx.db.get(factId);
        return fact ?
            {
              _id: fact._id,
              subject: fact.subject,
              predicate: fact.predicate,
              object: fact.object,
              evidenceSnippet: fact.evidenceSnippet,
            }
          : null;
      })
    );

    const document = await ctx.db.get(alert.documentId);

    return {
      alert,
      entities: entities.filter(Boolean),
      facts: facts.filter(Boolean),
      document: document ? { _id: document._id, title: document.title } : null,
    };
  },
});

export const countByProject = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const isOwner = await verifyProjectOwnership(ctx, projectId);
    if (!isOwner) return { open: 0, resolved: 0, dismissed: 0, total: 0 };

    const alerts = await ctx.db
      .query('alerts')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect();

    return {
      open: alerts.filter((a) => a.status === 'open').length,
      resolved: alerts.filter((a) => a.status === 'resolved').length,
      dismissed: alerts.filter((a) => a.status === 'dismissed').length,
      total: alerts.length,
    };
  },
});

export const resolve = mutation({
  args: {
    id: v.id('alerts'),
    resolutionNotes: v.optional(v.string()),
  },
  handler: async (ctx, { id, resolutionNotes }) => {
    const userId = await requireAuth(ctx);
    const alert = unwrapOrThrow(await verifyAlertAccess(ctx, id, userId));

    const wasOpen = alert.status === 'open';

    await ctx.db.patch(id, {
      status: 'resolved',
      resolvedAt: Date.now(),
      resolutionNotes,
    });

    if (wasOpen) {
      const project = await ctx.db.get(alert.projectId);
      if (project) {
        const stats = project.stats ?? {
          documentCount: 0,
          entityCount: 0,
          factCount: 0,
          alertCount: 0,
          noteCount: 0,
        };
        await ctx.db.patch(alert.projectId, {
          updatedAt: Date.now(),
          stats: { ...stats, alertCount: Math.max(0, stats.alertCount - 1) },
        });
      }
    }

    return id;
  },
});

export const dismiss = mutation({
  args: {
    id: v.id('alerts'),
    resolutionNotes: v.optional(v.string()),
  },
  handler: async (ctx, { id, resolutionNotes }) => {
    const userId = await requireAuth(ctx);
    const alert = unwrapOrThrow(await verifyAlertAccess(ctx, id, userId));

    const wasOpen = alert.status === 'open';

    await ctx.db.patch(id, {
      status: 'dismissed',
      resolvedAt: Date.now(),
      resolutionNotes,
    });

    if (wasOpen) {
      const project = await ctx.db.get(alert.projectId);
      if (project) {
        const stats = project.stats ?? {
          documentCount: 0,
          entityCount: 0,
          factCount: 0,
          alertCount: 0,
          noteCount: 0,
        };
        await ctx.db.patch(alert.projectId, {
          updatedAt: Date.now(),
          stats: { ...stats, alertCount: Math.max(0, stats.alertCount - 1) },
        });
      }
    }

    return id;
  },
});

export const reopen = mutation({
  args: { id: v.id('alerts') },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    const alert = unwrapOrThrow(await verifyAlertAccess(ctx, id, userId));

    const wasNotOpen = alert.status !== 'open';

    await ctx.db.patch(id, {
      status: 'open',
      resolvedAt: undefined,
      resolutionNotes: undefined,
    });

    if (wasNotOpen) {
      const project = await ctx.db.get(alert.projectId);
      if (project) {
        const stats = project.stats ?? {
          documentCount: 0,
          entityCount: 0,
          factCount: 0,
          alertCount: 0,
          noteCount: 0,
        };
        await ctx.db.patch(alert.projectId, {
          updatedAt: Date.now(),
          stats: { ...stats, alertCount: stats.alertCount + 1 },
        });
      }
    }

    return id;
  },
});

export const remove = mutation({
  args: { id: v.id('alerts') },
  handler: async (ctx, { id }) => {
    const userId = await requireAuth(ctx);
    const alert = unwrapOrThrow(await verifyAlertAccess(ctx, id, userId));

    await ctx.db.delete(id);

    if (alert.status === 'open') {
      const project = await ctx.db.get(alert.projectId);
      if (project) {
        const stats = project.stats ?? {
          documentCount: 0,
          entityCount: 0,
          factCount: 0,
          alertCount: 0,
          noteCount: 0,
        };
        await ctx.db.patch(alert.projectId, {
          updatedAt: Date.now(),
          stats: { ...stats, alertCount: Math.max(0, stats.alertCount - 1) },
        });
      }
    }

    return id;
  },
});

export const resolveWithCanonUpdate = mutation({
  args: {
    id: v.id('alerts'),
    factId: v.id('facts'),
    newValue: v.string(),
    resolutionNotes: v.optional(v.string()),
  },
  handler: async (ctx, { id, factId, newValue, resolutionNotes }) => {
    const userId = await requireAuth(ctx);
    const alert = unwrapOrThrow(await verifyAlertAccess(ctx, id, userId));

    const fact = await ctx.db.get(factId);
    if (!fact) {
      throw new Error('Fact not found');
    }

    if (!alert.factIds.includes(factId)) {
      throw new Error('Fact not associated with this alert');
    }

    const previousObject = fact.object;
    let updatedEvidenceSnippet: string | undefined;
    let updatedEvidencePosition = fact.evidencePosition;

    const doc = fact.documentId ? await ctx.db.get(fact.documentId) : null;
    if (doc?.content) {
      const replaceInSnippet = (snippet: string) =>
        snippet.includes(previousObject) ? snippet.replace(previousObject, newValue) : null;
      let updatedContent: string | undefined;

      if (fact.evidencePosition) {
        const { start, end } = fact.evidencePosition;
        if (start >= 0 && end <= doc.content.length && start < end) {
          const snippet = doc.content.slice(start, end);
          const replacement = replaceInSnippet(snippet);
          if (replacement) {
            updatedEvidenceSnippet = replacement;
            updatedEvidencePosition = { start, end: start + replacement.length };
            updatedContent = doc.content.slice(0, start) + replacement + doc.content.slice(end);
          }
        }
      }

      if (!updatedContent && fact.evidenceSnippet) {
        const index = doc.content.indexOf(fact.evidenceSnippet);
        const replacement = replaceInSnippet(fact.evidenceSnippet);
        if (index !== -1 && replacement) {
          updatedEvidenceSnippet = replacement;
          updatedEvidencePosition = { start: index, end: index + replacement.length };
          updatedContent =
            doc.content.slice(0, index) +
            replacement +
            doc.content.slice(index + fact.evidenceSnippet.length);
        }
      }

      if (updatedContent && fact.documentId) {
        await ctx.db.patch(fact.documentId, {
          content: updatedContent,
          wordCount: countWords(updatedContent),
          updatedAt: Date.now(),
          processingStatus: 'pending',
        });
      }
    }

    await ctx.db.patch(factId, {
      object: newValue,
      ...(updatedEvidenceSnippet ?
        {
          evidenceSnippet: updatedEvidenceSnippet,
          evidencePosition: updatedEvidencePosition,
        }
      : {}),
    });

    const wasOpen = alert.status === 'open';

    await ctx.db.patch(id, {
      status: 'resolved',
      resolvedAt: Date.now(),
      resolutionNotes:
        resolutionNotes ?? `Updated fact: ${fact.subject} ${fact.predicate} ${newValue}`,
    });

    if (wasOpen) {
      const project = await ctx.db.get(alert.projectId);
      if (project) {
        const stats = project.stats ?? {
          documentCount: 0,
          entityCount: 0,
          factCount: 0,
          alertCount: 0,
          noteCount: 0,
        };
        await ctx.db.patch(alert.projectId, {
          updatedAt: Date.now(),
          stats: { ...stats, alertCount: Math.max(0, stats.alertCount - 1) },
        });
      }
    }

    return { alertId: id, factId };
  },
});

export const resolveAll = mutation({
  args: {
    projectId: v.id('projects'),
    resolutionNotes: v.optional(v.string()),
  },
  handler: async (ctx, { projectId, resolutionNotes }) => {
    const userId = await requireAuth(ctx);

    const project = await ctx.db.get(projectId);
    if (!project || project.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const openAlerts = await ctx.db
      .query('alerts')
      .withIndex('by_project', (q) => q.eq('projectId', projectId).eq('status', 'open'))
      .collect();

    const now = Date.now();
    for (const alert of openAlerts) {
      await ctx.db.patch(alert._id, {
        status: 'resolved',
        resolvedAt: now,
        resolutionNotes,
      });
    }

    const stats = project.stats ?? {
      documentCount: 0,
      entityCount: 0,
      factCount: 0,
      alertCount: 0,
    };
    await ctx.db.patch(projectId, {
      updatedAt: now,
      stats: { ...stats, alertCount: 0, noteCount: 0 },
    });

    return openAlerts.length;
  },
});

export const dismissAll = mutation({
  args: {
    projectId: v.id('projects'),
    resolutionNotes: v.optional(v.string()),
  },
  handler: async (ctx, { projectId, resolutionNotes }) => {
    const userId = await requireAuth(ctx);

    const project = await ctx.db.get(projectId);
    if (!project || project.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const openAlerts = await ctx.db
      .query('alerts')
      .withIndex('by_project', (q) => q.eq('projectId', projectId).eq('status', 'open'))
      .collect();

    const now = Date.now();
    for (const alert of openAlerts) {
      await ctx.db.patch(alert._id, {
        status: 'dismissed',
        resolvedAt: now,
        resolutionNotes,
      });
    }

    const stats = project.stats ?? {
      documentCount: 0,
      entityCount: 0,
      factCount: 0,
      alertCount: 0,
    };
    await ctx.db.patch(projectId, {
      updatedAt: now,
      stats: { ...stats, alertCount: 0, noteCount: 0 },
    });

    return openAlerts.length;
  },
});
