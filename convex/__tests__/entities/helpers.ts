import { convexTest } from 'convex-test';
import type { Id } from '../../_generated/dataModel';
import schema from '../../schema';

export const modules = import.meta.glob('../../**/*.ts');

export function createTestContext() {
  return convexTest(schema, modules);
}

export async function setupAuthenticatedUser(t: ReturnType<typeof convexTest>) {
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

export async function setupProjectWithEntities(
  t: ReturnType<typeof convexTest>,
  userId: Id<'users'>
) {
  return await t.run(async (ctx) => {
    const projectId = await ctx.db.insert('projects', {
      userId,
      name: 'Test Project',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stats: { documentCount: 0, entityCount: 0, factCount: 0, alertCount: 0 },
    });

    const documentId = await ctx.db.insert('documents', {
      projectId,
      title: 'Test Document',
      content: 'Test content',
      contentType: 'text',
      orderIndex: 0,
      wordCount: 2,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      processingStatus: 'pending',
    });

    const entityId = await ctx.db.insert('entities', {
      projectId,
      name: 'Jon Snow',
      type: 'character',
      description: 'King in the North',
      aliases: ['Lord Snow', 'The White Wolf'],
      firstMentionedIn: documentId,
      status: 'confirmed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { projectId, documentId, entityId };
  });
}
