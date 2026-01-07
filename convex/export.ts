import { v } from 'convex/values';
import { action, query } from './_generated/server';
import { getAuthUserId } from './lib/auth';

const formatValidator = v.union(v.literal('json'), v.literal('markdown'), v.literal('csv'));

type EntityType = 'character' | 'location' | 'item' | 'concept' | 'event';
type FactStatus = 'pending' | 'confirmed' | 'rejected';

type ExportData = {
  project: {
    name: string;
    description?: string;
    exportedAt: string;
  };
  documents: Array<{
    title: string;
    contentType: string;
    wordCount: number;
    processingStatus: string;
  }>;
  entities: Array<{
    name: string;
    type: EntityType;
    description?: string;
    aliases: string[];
    status: string;
  }>;
  facts: Array<{
    entityName: string;
    subject: string;
    predicate: string;
    object: string;
    confidence: number;
    evidenceSnippet: string;
    status: FactStatus;
  }>;
};

function formatAsJson(data: ExportData): string {
  return JSON.stringify(data, null, 2);
}

function formatAsMarkdown(data: ExportData): string {
  const lines: string[] = [];

  lines.push(`# ${data.project.name}`);
  lines.push('');
  if (data.project.description) {
    lines.push(data.project.description);
    lines.push('');
  }
  lines.push(`*Exported: ${data.project.exportedAt}*`);
  lines.push('');

  lines.push('## Documents');
  lines.push('');
  if (data.documents.length === 0) {
    lines.push('*No documents*');
  } else {
    for (const doc of data.documents) {
      lines.push(`- **${doc.title}** (${doc.wordCount} words, ${doc.processingStatus})`);
    }
  }
  lines.push('');

  lines.push('## Canon Entities');
  lines.push('');

  const entityTypes: EntityType[] = ['character', 'location', 'item', 'concept', 'event'];
  for (const type of entityTypes) {
    const typeEntities = data.entities.filter((e) => e.type === type);
    if (typeEntities.length > 0) {
      lines.push(`### ${type.charAt(0).toUpperCase() + type.slice(1)}s`);
      lines.push('');
      for (const entity of typeEntities) {
        lines.push(`#### ${entity.name}`);
        if (entity.description) {
          lines.push(entity.description);
        }
        if (entity.aliases.length > 0) {
          lines.push(`*Also known as: ${entity.aliases.join(', ')}*`);
        }

        const entityFacts = data.facts.filter((f) => f.entityName === entity.name);
        if (entityFacts.length > 0) {
          lines.push('');
          lines.push('**Facts:**');
          for (const fact of entityFacts) {
            lines.push(`- ${fact.subject} ${fact.predicate} ${fact.object}`);
            lines.push(`  > "${fact.evidenceSnippet}"`);
          }
        }
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

function formatAsCsv(data: ExportData): string {
  const lines: string[] = [];

  lines.push('# ENTITIES');
  lines.push('Name,Type,Description,Aliases,Status');
  for (const entity of data.entities) {
    const escapedDesc = (entity.description ?? '').replace(/"/g, '""');
    const escapedAliases = entity.aliases.join('; ').replace(/"/g, '""');
    lines.push(
      `"${entity.name}","${entity.type}","${escapedDesc}","${escapedAliases}","${entity.status}"`
    );
  }
  lines.push('');

  lines.push('# FACTS');
  lines.push('Entity,Subject,Predicate,Object,Confidence,Evidence,Status');
  for (const fact of data.facts) {
    const escapedEvidence = fact.evidenceSnippet.replace(/"/g, '""');
    lines.push(
      `"${fact.entityName}","${fact.subject}","${fact.predicate}","${fact.object}",${fact.confidence},"${escapedEvidence}","${fact.status}"`
    );
  }
  lines.push('');

  lines.push('# DOCUMENTS');
  lines.push('Title,ContentType,WordCount,Status');
  for (const doc of data.documents) {
    lines.push(`"${doc.title}","${doc.contentType}",${doc.wordCount},"${doc.processingStatus}"`);
  }

  return lines.join('\n');
}

export const gatherExportData = query({
  args: { projectId: v.id('projects'), includeUnrevealed: v.optional(v.boolean()) },
  handler: async (ctx, { projectId, includeUnrevealed }): Promise<ExportData | null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const project = await ctx.db.get(projectId);
    if (!project || project.userId !== userId) return null;

    const documents = await ctx.db
      .query('documents')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect();

    const entities = await ctx.db
      .query('entities')
      .withIndex('by_project_status', (q) => q.eq('projectId', projectId).eq('status', 'confirmed'))
      .collect();

    const facts = await ctx.db
      .query('facts')
      .withIndex('by_project', (q) => q.eq('projectId', projectId).eq('status', 'confirmed'))
      .collect();

    const shouldFilterRevealed = project.projectType === 'ttrpg' && includeUnrevealed === false;
    const visibleEntities = shouldFilterRevealed ?
        entities.filter((entity) => entity.revealedToViewers === true)
      : entities;
    const visibleEntityIds = new Set(visibleEntities.map((entity) => entity._id));
    const visibleFacts = shouldFilterRevealed ?
        facts.filter((fact) => !fact.entityId || visibleEntityIds.has(fact.entityId))
      : facts;

    const entityMap = new Map<string, string>();
    for (const entity of visibleEntities) {
      entityMap.set(entity._id, entity.name);
    }

    return {
      project: {
        name: project.name,
        description: project.description,
        exportedAt: new Date().toISOString(),
      },
      documents: documents.map((doc) => ({
        title: doc.title,
        contentType: doc.contentType,
        wordCount: doc.wordCount,
        processingStatus: doc.processingStatus,
      })),
      entities: visibleEntities.map((entity) => ({
        name: entity.name,
        type: entity.type,
        description: entity.description,
        aliases: entity.aliases,
        status: entity.status,
      })),
      facts: visibleFacts.map((fact) => ({
        entityName: fact.entityId ? (entityMap.get(fact.entityId) ?? 'Unknown') : 'Unlinked',
        subject: fact.subject,
        predicate: fact.predicate,
        object: fact.object,
        confidence: fact.confidence,
        evidenceSnippet: fact.evidenceSnippet ?? '',
        status: fact.status,
      })),
    };
  },
});

export const exportProject = action({
  args: {
    projectId: v.id('projects'),
    format: formatValidator,
    includeUnrevealed: v.optional(v.boolean()),
  },
  handler: async (ctx, { projectId, format, includeUnrevealed }): Promise<string | null> => {
    const data = await ctx.runQuery(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'export:gatherExportData' as any,
      { projectId, includeUnrevealed }
    );

    if (!data) return null;

    switch (format) {
      case 'json':
        return formatAsJson(data);
      case 'markdown':
        return formatAsMarkdown(data);
      case 'csv':
        return formatAsCsv(data);
      default:
        return null;
    }
  },
});
