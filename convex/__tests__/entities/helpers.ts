import { convexTest } from 'convex-test';
import type { Id } from '../../_generated/dataModel';
import schema from '../../schema';

const getModules = () => import.meta.glob('../../**/*.ts');

export type TestContext = ReturnType<typeof convexTest>;

export const defaultStats = () => ({
  documentCount: 0,
  entityCount: 0,
  factCount: 0,
  alertCount: 0,
  noteCount: 0,
});

export function createTestContext() {
  return convexTest(schema, getModules());
}

export async function setupAuthenticatedUser(t: TestContext) {
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

export async function setupOtherUser(t: TestContext) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      name: 'Other User',
      email: 'other@test.com',
      createdAt: Date.now(),
    });
  });
}

type ProjectOverrides = {
  name?: string;
  withStats?: boolean;
  stats?: {
    documentCount: number;
    entityCount: number;
    factCount: number;
    alertCount: number;
    noteCount: number;
  };
  projectType?: 'general' | 'fiction' | 'ttrpg' | 'worldbuilding' | 'game_dev' | 'screenplay';
};

export async function setupProject(
  t: TestContext,
  userId: Id<'users'>,
  overrides: ProjectOverrides = {}
) {
  const { name = 'Test Project', withStats = true, stats, projectType } = overrides;

  return await t.run(async (ctx) => {
    return await ctx.db.insert('projects', {
      userId,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...(withStats && { stats: stats ?? defaultStats() }),
      ...(projectType && { projectType }),
    });
  });
}

type DocumentOverrides = {
  title?: string;
  content?: string;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
};

export async function setupDocument(
  t: TestContext,
  projectId: Id<'projects'>,
  overrides: DocumentOverrides = {}
) {
  const {
    title = 'Test Document',
    content = 'Test content',
    processingStatus = 'completed',
  } = overrides;

  return await t.run(async (ctx) => {
    return await ctx.db.insert('documents', {
      projectId,
      title,
      content,
      contentType: 'text',
      orderIndex: 0,
      wordCount: content.split(' ').length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      processingStatus,
    });
  });
}

type EntityOverrides = {
  name?: string;
  type?: 'character' | 'location' | 'item' | 'concept' | 'event';
  description?: string;
  aliases?: string[];
  status?: 'pending' | 'confirmed';
  firstMentionedIn?: Id<'documents'>;
  revealedToViewers?: boolean;
};

export async function setupEntity(
  t: TestContext,
  projectId: Id<'projects'>,
  overrides: EntityOverrides = {}
) {
  const {
    name = 'Test Entity',
    type = 'character',
    description,
    aliases = [],
    status = 'pending',
    firstMentionedIn,
    revealedToViewers,
  } = overrides;

  return await t.run(async (ctx) => {
    return await ctx.db.insert('entities', {
      projectId,
      name,
      type,
      ...(description && { description }),
      aliases,
      status,
      ...(firstMentionedIn && { firstMentionedIn }),
      ...(revealedToViewers !== undefined && { revealedToViewers }),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

type FactOverrides = {
  subject?: string;
  predicate?: string;
  object?: string;
  confidence?: number;
  evidenceSnippet?: string;
  status?: 'pending' | 'confirmed' | 'rejected';
};

export async function setupFact(
  t: TestContext,
  ids: { projectId: Id<'projects'>; entityId: Id<'entities'>; documentId: Id<'documents'> },
  overrides: FactOverrides = {}
) {
  const {
    subject = 'Subject',
    predicate = 'is',
    object = 'Object',
    confidence = 1.0,
    evidenceSnippet = 'evidence text',
    status = 'pending',
  } = overrides;

  return await t.run(async (ctx) => {
    return await ctx.db.insert('facts', {
      projectId: ids.projectId,
      entityId: ids.entityId,
      documentId: ids.documentId,
      subject,
      predicate,
      object,
      confidence,
      evidenceSnippet,
      status,
      createdAt: Date.now(),
    });
  });
}

export async function setupProjectWithEntities(t: TestContext, userId: Id<'users'>) {
  const projectId = await setupProject(t, userId);
  const documentId = await setupDocument(t, projectId);
  const entityId = await setupEntity(t, projectId, {
    name: 'Jon Snow',
    type: 'character',
    description: 'King in the North',
    aliases: ['Lord Snow', 'The White Wolf'],
    status: 'confirmed',
    firstMentionedIn: documentId,
  });

  return { projectId, documentId, entityId };
}
