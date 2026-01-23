import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { api } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import schema from '../schema';

const getModules = () => import.meta.glob('../**/*.ts');

async function createStorageBlob(
  t: ReturnType<typeof convexTest>,
  contentType: string,
  size: number
): Promise<Id<'_storage'>> {
  return await t.run(async (ctx) => {
    const content = new Uint8Array(size);
    const blob = new Blob([content], { type: contentType });
    return await ctx.storage.store(blob);
  });
}

async function setupAuthenticatedUser(
  t: ReturnType<typeof convexTest>,
  overrides: Partial<Doc<'users'>> = {}
) {
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      name: 'Test User',
      email: 'test@example.com',
      createdAt: Date.now(),
      ...overrides,
    });
  });

  const asUser = t.withIdentity({ subject: userId });
  return { userId, asUser };
}

async function createProject(t: ReturnType<typeof convexTest>, userId: Id<'users'>) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert('projects', {
      userId,
      name: 'Project',
      createdAt: now,
      updatedAt: now,
    });
  });
}

async function createDocument(
  t: ReturnType<typeof convexTest>,
  projectId: Id<'projects'>,
  storageId: Id<'_storage'>
) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert('documents', {
      projectId,
      title: 'File Doc',
      storageId,
      contentType: 'file',
      orderIndex: 0,
      wordCount: 0,
      createdAt: now,
      updatedAt: now,
      processingStatus: 'completed',
    });
  });
}

describe('storage access controls', () => {
  it('allows owners to access document storage and clears refs on delete', async () => {
    const t = convexTest(schema, getModules());
    const storageId = await createStorageBlob(t, 'text/plain', 512);
    const { userId, asUser } = await setupAuthenticatedUser(t);
    const projectId = await createProject(t, userId);
    const docId = await createDocument(t, projectId, storageId);

    const url = await asUser.query(api.storage.getFileUrl, { storageId });
    expect(url).toBeTruthy();

    const meta = await asUser.query(api.storage.getFileMetadata, { storageId });
    expect(meta?._id).toBe(storageId);

    await asUser.mutation(api.storage.deleteFile, { storageId });

    const doc = await t.run(async (ctx) => ctx.db.get(docId));
    expect(doc?.storageId).toBeUndefined();
  });

  it('allows owners to delete avatar storage and clears avatarStorageId', async () => {
    const t = convexTest(schema, getModules());
    const storageId = await createStorageBlob(t, 'image/png', 256);
    const { userId, asUser } = await setupAuthenticatedUser(t, { avatarStorageId: storageId });

    const meta = await asUser.query(api.storage.getFileMetadata, { storageId });
    expect(meta?._id).toBe(storageId);

    await asUser.mutation(api.storage.deleteFile, { storageId });

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.avatarStorageId).toBeUndefined();
  });

  it('blocks avatar updates when storageId is already in use', async () => {
    const t = convexTest(schema, getModules());
    const storageId = await createStorageBlob(t, 'image/png', 128);
    const { userId: ownerId } = await setupAuthenticatedUser(t, {
      email: 'owner@example.com',
      avatarStorageId: storageId,
    });
    const { asUser: otherUser } = await setupAuthenticatedUser(t, {
      email: 'other@example.com',
    });

    await expect(otherUser.mutation(api.users.updateAvatar, { storageId })).rejects.toThrow(
      'File already in use'
    );

    const projectId = await createProject(t, ownerId);
    await createDocument(t, projectId, storageId);

    await expect(otherUser.mutation(api.users.updateAvatar, { storageId })).rejects.toThrow(
      'File already in use'
    );
  });

  it('blocks document create when storageId belongs to an avatar', async () => {
    const t = convexTest(schema, getModules());
    const storageId = await createStorageBlob(t, 'text/plain', 128);
    await setupAuthenticatedUser(t, { avatarStorageId: storageId });

    const { userId, asUser } = await setupAuthenticatedUser(t, { email: 'doc@example.com' });
    const projectId = await createProject(t, userId);

    await expect(
      asUser.mutation(api.documents.create, {
        projectId,
        title: 'Doc',
        contentType: 'file',
        storageId,
      })
    ).rejects.toThrow('File already in use');
  });

  it('blocks document update when storageId is used by another document', async () => {
    const t = convexTest(schema, getModules());
    const storageId = await createStorageBlob(t, 'text/plain', 128);
    const { userId, asUser } = await setupAuthenticatedUser(t);
    const projectId = await createProject(t, userId);

    await createDocument(t, projectId, storageId);
    const docB = await createDocument(t, projectId, await createStorageBlob(t, 'text/plain', 64));

    await expect(
      asUser.mutation(api.documents.update, {
        id: docB,
        storageId,
      })
    ).rejects.toThrow('File already in use');
  });

  it('blocks access for other users and unauthenticated requests', async () => {
    const t = convexTest(schema, getModules());
    const storageId = await createStorageBlob(t, 'text/plain', 128);
    const { userId } = await setupAuthenticatedUser(t);
    const projectId = await createProject(t, userId);
    await createDocument(t, projectId, storageId);

    const { asUser: otherUser } = await setupAuthenticatedUser(t, {
      email: 'other@example.com',
    });

    await expect(otherUser.query(api.storage.getFileUrl, { storageId })).rejects.toThrow(
      'Unauthorized'
    );
    await expect(t.query(api.storage.getFileMetadata, { storageId })).rejects.toThrow(
      'Unauthorized'
    );
  });
});
