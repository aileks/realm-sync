import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { api } from '../_generated/api';
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

async function setupProjectWithDocs(t: ReturnType<typeof convexTest>, userId: string) {
  return await t.run(async (ctx) => {
    const projectId = await ctx.db.insert('projects', {
      userId: userId as typeof userId & { __tableName: 'users' },
      name: 'Test Project',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const doc1Id = await ctx.db.insert('documents', {
      projectId,
      title: 'First Doc',
      content: 'Hello world',
      contentType: 'text',
      orderIndex: 0,
      wordCount: 2,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      processingStatus: 'pending',
    });

    const doc2Id = await ctx.db.insert('documents', {
      projectId,
      title: 'Second Doc',
      content: 'Goodbye world',
      contentType: 'text',
      orderIndex: 1,
      wordCount: 2,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      processingStatus: 'pending',
    });

    return { projectId, doc1Id, doc2Id };
  });
}

describe('documents', () => {
  describe('list query', () => {
    it('returns documents for project owner', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId } = await setupProjectWithDocs(t, userId);

      const docs = await asUser.query(api.documents.list, { projectId });
      expect(docs).toHaveLength(2);
    });

    it('returns empty for non-owner', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const projectId = await t.run(async (ctx) => {
        const otherId = await ctx.db.insert('users', {
          name: 'Other',
          email: 'other@test.com',
          createdAt: Date.now(),
        });
        return await ctx.db.insert('projects', {
          userId: otherId,
          name: 'Other Project',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const docs = await asUser.query(api.documents.list, { projectId });
      expect(docs).toEqual([]);
    });
  });

  describe('get query', () => {
    it('returns document for owner', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { doc1Id } = await setupProjectWithDocs(t, userId);

      const doc = await asUser.query(api.documents.get, { id: doc1Id });
      expect(doc?.title).toBe('First Doc');
    });

    it('returns null for non-owner', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const docId = await t.run(async (ctx) => {
        const otherId = await ctx.db.insert('users', {
          name: 'Other',
          email: 'other@test.com',
          createdAt: Date.now(),
        });
        const pId = await ctx.db.insert('projects', {
          userId: otherId,
          name: 'Other',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return await ctx.db.insert('documents', {
          projectId: pId,
          title: 'Secret',
          contentType: 'text',
          orderIndex: 0,
          wordCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          processingStatus: 'pending',
        });
      });

      const doc = await asUser.query(api.documents.get, { id: docId });
      expect(doc).toBeNull();
    });
  });

  describe('remove mutation', () => {
    it('cascades delete to document facts and alerts', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const { projectId, documentId, factId, alertId } = await t.run(async (ctx) => {
        const now = Date.now();
        const projectId = await ctx.db.insert('projects', {
          userId,
          name: 'Cascade Project',
          createdAt: now,
          updatedAt: now,
          stats: { documentCount: 1, entityCount: 1, factCount: 1, alertCount: 1, noteCount: 0 },
        });

        const documentId = await ctx.db.insert('documents', {
          projectId,
          title: 'To delete',
          content: 'Canon text',
          contentType: 'text',
          orderIndex: 0,
          wordCount: 2,
          createdAt: now,
          updatedAt: now,
          processingStatus: 'completed',
        });

        const entityId = await ctx.db.insert('entities', {
          projectId,
          name: 'Marcus',
          type: 'character',
          aliases: [],
          status: 'confirmed',
          createdAt: now,
          updatedAt: now,
        });

        const factId = await ctx.db.insert('facts', {
          projectId,
          entityId,
          documentId,
          subject: 'Marcus',
          predicate: 'has',
          object: 'blue eyes',
          confidence: 1,
          evidenceSnippet: 'Marcus has blue eyes.',
          status: 'confirmed',
          createdAt: now,
        });

        const alertId = await ctx.db.insert('alerts', {
          projectId,
          documentId,
          factIds: [factId],
          entityIds: [entityId],
          type: 'contradiction',
          severity: 'error',
          title: 'Eye color mismatch',
          description: 'desc',
          evidence: [],
          status: 'open',
          createdAt: now,
        });

        return { projectId, documentId, factId, alertId };
      });

      await asUser.mutation(api.documents.remove, { id: documentId });

      const doc = await t.run(async (ctx) => ctx.db.get(documentId));
      expect(doc).toBeNull();

      const fact = await t.run(async (ctx) => ctx.db.get(factId));
      expect(fact).toBeNull();

      const alert = await t.run(async (ctx) => ctx.db.get(alertId));
      expect(alert).toBeNull();

      const project = await t.run(async (ctx) => ctx.db.get(projectId));
      expect(project?.stats?.documentCount).toBe(0);
      expect(project?.stats?.factCount).toBe(0);
      expect(project?.stats?.alertCount).toBe(0);
    });

    it('removes alerts in other documents when they reference removed facts', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      const { projectId, removeDocId, keepDocId, keepFactId, alertId } = await t.run(async (ctx) => {
        const now = Date.now();
        const projectId = await ctx.db.insert('projects', {
          userId,
          name: 'Cross-ref Project',
          createdAt: now,
          updatedAt: now,
          stats: { documentCount: 2, entityCount: 1, factCount: 2, alertCount: 1, noteCount: 0 },
        });

        const removeDocId = await ctx.db.insert('documents', {
          projectId,
          title: 'Old Canon',
          content: 'Old detail',
          contentType: 'text',
          orderIndex: 0,
          wordCount: 2,
          createdAt: now,
          updatedAt: now,
          processingStatus: 'completed',
        });

        const keepDocId = await ctx.db.insert('documents', {
          projectId,
          title: 'New Chapter',
          content: 'New detail',
          contentType: 'text',
          orderIndex: 1,
          wordCount: 2,
          createdAt: now,
          updatedAt: now,
          processingStatus: 'completed',
        });

        const entityId = await ctx.db.insert('entities', {
          projectId,
          name: 'Marcus',
          type: 'character',
          aliases: [],
          status: 'confirmed',
          createdAt: now,
          updatedAt: now,
        });

        const removedFactId = await ctx.db.insert('facts', {
          projectId,
          entityId,
          documentId: removeDocId,
          subject: 'Marcus',
          predicate: 'has',
          object: 'blue eyes',
          confidence: 1,
          evidenceSnippet: 'blue eyes',
          status: 'confirmed',
          createdAt: now,
        });

        const keepFactId = await ctx.db.insert('facts', {
          projectId,
          entityId,
          documentId: keepDocId,
          subject: 'Marcus',
          predicate: 'has',
          object: 'brown eyes',
          confidence: 1,
          evidenceSnippet: 'brown eyes',
          status: 'confirmed',
          createdAt: now,
        });

        const alertId = await ctx.db.insert('alerts', {
          projectId,
          documentId: keepDocId,
          factIds: [removedFactId, keepFactId],
          entityIds: [entityId],
          type: 'contradiction',
          severity: 'error',
          title: 'Color conflict',
          description: 'desc',
          evidence: [],
          status: 'open',
          createdAt: now,
        });

        return { projectId, removeDocId, keepDocId, keepFactId, alertId };
      });

      await asUser.mutation(api.documents.remove, { id: removeDocId });

      const keptDoc = await t.run(async (ctx) => ctx.db.get(keepDocId));
      expect(keptDoc).not.toBeNull();

      const keptFact = await t.run(async (ctx) => ctx.db.get(keepFactId));
      expect(keptFact).not.toBeNull();

      const alert = await t.run(async (ctx) => ctx.db.get(alertId));
      expect(alert).toBeNull();

      const project = await t.run(async (ctx) => ctx.db.get(projectId));
      expect(project?.stats?.documentCount).toBe(1);
      expect(project?.stats?.factCount).toBe(1);
      expect(project?.stats?.alertCount).toBe(0);
    });
  });

  describe('reorder mutation', () => {
    it('reorders documents', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { projectId, doc1Id, doc2Id } = await setupProjectWithDocs(t, userId);

      await asUser.mutation(api.documents.reorder, {
        projectId,
        documentIds: [doc2Id, doc1Id],
      });

      const docs = await asUser.query(api.documents.list, { projectId });
      const doc1 = docs.find((d) => d._id === doc1Id);
      const doc2 = docs.find((d) => d._id === doc2Id);
      expect(doc2?.orderIndex).toBe(0);
      expect(doc1?.orderIndex).toBe(1);
    });

    it('throws for non-owner', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const { projectId, docId } = await t.run(async (ctx) => {
        const otherId = await ctx.db.insert('users', {
          name: 'Other',
          email: 'other@test.com',
          createdAt: Date.now(),
        });
        const pId = await ctx.db.insert('projects', {
          userId: otherId,
          name: 'Other',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        const dId = await ctx.db.insert('documents', {
          projectId: pId,
          title: 'Doc',
          contentType: 'text',
          orderIndex: 0,
          wordCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          processingStatus: 'pending',
        });
        return { projectId: pId, docId: dId };
      });

      await expect(
        asUser.mutation(api.documents.reorder, { projectId, documentIds: [docId] })
      ).rejects.toThrow(/unauthorized/i);
    });
  });

  describe('updateProcessingStatus mutation', () => {
    it('updates status', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);
      const { doc1Id } = await setupProjectWithDocs(t, userId);

      await asUser.mutation(api.documents.updateProcessingStatus, {
        id: doc1Id,
        status: 'completed',
      });

      const doc = await asUser.query(api.documents.get, { id: doc1Id });
      expect(doc?.processingStatus).toBe('completed');
      expect(doc?.processedAt).toBeDefined();
    });

    it('throws for non-owner', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const docId = await t.run(async (ctx) => {
        const otherId = await ctx.db.insert('users', {
          name: 'Other',
          email: 'other@test.com',
          createdAt: Date.now(),
        });
        const pId = await ctx.db.insert('projects', {
          userId: otherId,
          name: 'Other',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return await ctx.db.insert('documents', {
          projectId: pId,
          title: 'Doc',
          contentType: 'text',
          orderIndex: 0,
          wordCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          processingStatus: 'pending',
        });
      });

      await expect(
        asUser.mutation(api.documents.updateProcessingStatus, { id: docId, status: 'completed' })
      ).rejects.toThrow(/unauthorized/i);
    });
  });

  describe('listNeedingReview query', () => {
    it('returns documents with pending entities', async () => {
      const t = convexTest(schema, getModules());
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
      const t = convexTest(schema, getModules());
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
      const t = convexTest(schema, getModules());
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
      const t = convexTest(schema, getModules());
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

      const docs = await asUser.query(api.documents.listNeedingReview, { projectId });
      expect(docs).toEqual([]);
    });
  });
});
