import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { api } from '../_generated/api';
import schema from '../schema';

const modules = import.meta.glob('../**/*.ts');

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

describe('documents', () => {
  describe('listNeedingReview query', () => {
    it('returns documents with pending entities', async () => {
      const t = convexTest(schema, modules);
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        const pId = await ctx.db.insert('projects', {
          userId,
          name: 'Test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const docId = await ctx.db.insert('documents', {
          projectId: pId,
          title: 'Needs Review',
          content: 'Some content',
          contentType: 'text',
          orderIndex: 0,
          wordCount: 2,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          processingStatus: 'completed',
        });

        await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Pending Entity',
          type: 'character',
          aliases: [],
          firstMentionedIn: docId,
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return pId;
      });

      const docs = await asUser.query(api.documents.listNeedingReview, { projectId });
      expect(docs).toHaveLength(1);
      expect(docs[0].title).toBe('Needs Review');
      expect(docs[0].pendingEntityCount).toBe(1);
      expect(docs[0].pendingFactCount).toBe(0);
    });

    it('returns documents with pending facts', async () => {
      const t = convexTest(schema, modules);
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        const pId = await ctx.db.insert('projects', {
          userId,
          name: 'Test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const docId = await ctx.db.insert('documents', {
          projectId: pId,
          title: 'Has Pending Facts',
          content: 'Content here',
          contentType: 'text',
          orderIndex: 0,
          wordCount: 2,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          processingStatus: 'completed',
        });

        const entityId = await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Confirmed Entity',
          type: 'character',
          aliases: [],
          status: 'confirmed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert('facts', {
          projectId: pId,
          entityId,
          documentId: docId,
          subject: 'Subject',
          predicate: 'is',
          object: 'Object',
          confidence: 1.0,
          evidenceSnippet: 'evidence',
          status: 'pending',
          createdAt: Date.now(),
        });

        return pId;
      });

      const docs = await asUser.query(api.documents.listNeedingReview, { projectId });
      expect(docs).toHaveLength(1);
      expect(docs[0].pendingEntityCount).toBe(0);
      expect(docs[0].pendingFactCount).toBe(1);
    });

    it('excludes documents without pending items', async () => {
      const t = convexTest(schema, modules);
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        const pId = await ctx.db.insert('projects', {
          userId,
          name: 'Test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert('documents', {
          projectId: pId,
          title: 'All Reviewed',
          content: 'Done',
          contentType: 'text',
          orderIndex: 0,
          wordCount: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          processingStatus: 'completed',
        });

        return pId;
      });

      const docs = await asUser.query(api.documents.listNeedingReview, { projectId });
      expect(docs).toHaveLength(0);
    });

    it('excludes non-completed documents', async () => {
      const t = convexTest(schema, modules);
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        const pId = await ctx.db.insert('projects', {
          userId,
          name: 'Test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const docId = await ctx.db.insert('documents', {
          projectId: pId,
          title: 'Still Processing',
          content: 'Content',
          contentType: 'text',
          orderIndex: 0,
          wordCount: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          processingStatus: 'processing',
        });

        await ctx.db.insert('entities', {
          projectId: pId,
          name: 'Pending Entity',
          type: 'character',
          aliases: [],
          firstMentionedIn: docId,
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return pId;
      });

      const docs = await asUser.query(api.documents.listNeedingReview, { projectId });
      expect(docs).toHaveLength(0);
    });

    it('returns empty array when not project owner', async () => {
      const t = convexTest(schema, modules);
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

      const docs = await asUser.query(api.documents.listNeedingReview, { projectId });
      expect(docs).toEqual([]);
    });
  });
});
