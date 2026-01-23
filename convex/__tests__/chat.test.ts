import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { api } from '../_generated/api';
import { register as registerPersistentTextStreaming } from '@convex-dev/persistent-text-streaming/test';
import schema from '../schema';
import { ConvexError } from 'convex/values';

const getModules = () => import.meta.glob('../**/*.ts');

async function setupAuthenticatedUser(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      name: 'Test User',
      email: `user-${Math.random().toString(36).slice(2, 8)}@example.com`,
      createdAt: Date.now(),
    });
  });

  const asUser = t.withIdentity({ subject: userId });
  return { userId, asUser };
}

describe('chat streaming auth', () => {
  it('requires auth for createStreamingChat', async () => {
    const t = convexTest(schema, getModules());
    registerPersistentTextStreaming(t);

    try {
      await t.mutation(api.chat.createStreamingChat, { messages: [] });
      throw new Error('Expected unauthenticated error');
    } catch (error) {
      expect(error).toBeInstanceOf(ConvexError);
      if (error instanceof ConvexError) {
        expect(error.data).toMatchObject({ code: 'unauthenticated' });
      }
    }
  });

  it('binds stream access to the authenticated user', async () => {
    const t = convexTest(schema, getModules());
    registerPersistentTextStreaming(t);
    const { asUser } = await setupAuthenticatedUser(t);
    const { asUser: otherUser } = await setupAuthenticatedUser(t);

    const { streamId } = await asUser.mutation(api.chat.createStreamingChat, { messages: [] });

    try {
      await otherUser.query(api.chat.getStreamBody, { streamId });
      throw new Error('Expected unauthorized error');
    } catch (error) {
      expect(error).toBeInstanceOf(ConvexError);
      if (error instanceof ConvexError) {
        expect(error.data).toMatchObject({ code: 'unauthorized' });
      }
    }
  });

  it('blocks sendMessage without auth', async () => {
    const t = convexTest(schema, getModules());
    registerPersistentTextStreaming(t);

    try {
      await t.action(api.chat.sendMessage, {
        messages: [{ role: 'user', content: 'Hello' }],
      });
      throw new Error('Expected unauthenticated error');
    } catch (error) {
      expect(error).toBeInstanceOf(ConvexError);
      if (error instanceof ConvexError) {
        expect(error.data).toMatchObject({ code: 'unauthenticated' });
      }
    }
  });
});

describe('chat streaming token enforcement', () => {
  it('rejects invalid stream tokens', async () => {
    const t = convexTest(schema, getModules());
    registerPersistentTextStreaming(t);
    const { asUser } = await setupAuthenticatedUser(t);

    const { streamId } = await asUser.mutation(api.chat.createStreamingChat, { messages: [] });
    const response = await t.fetch('/chat-stream', {
      method: 'POST',
      headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        streamId,
        token: 'invalid-token',
        messages: [],
      }),
    });

    expect(response.status).toBe(401);
  });

  it('rejects expired streams', async () => {
    const t = convexTest(schema, getModules());
    registerPersistentTextStreaming(t);
    const { asUser } = await setupAuthenticatedUser(t);

    const { streamId, token } = await asUser.mutation(api.chat.createStreamingChat, {
      messages: [],
    });

    await t.run(async (ctx) => {
      const stream = await ctx.db
        .query('chatStreams')
        .withIndex('by_stream', (q) => q.eq('streamId', streamId))
        .first();
      if (!stream) throw new Error('Stream not found');
      await ctx.db.patch(stream._id, { expiresAt: Date.now() - 1 });
    });

    const response = await t.fetch('/chat-stream', {
      method: 'POST',
      headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        streamId,
        token,
        messages: [],
      }),
    });

    expect(response.status).toBe(401);
  });

  it('rejects reuse of a stream token', async () => {
    const t = convexTest(schema, getModules());
    registerPersistentTextStreaming(t);
    const { asUser } = await setupAuthenticatedUser(t);

    const { streamId, token } = await asUser.mutation(api.chat.createStreamingChat, {
      messages: [],
    });

    await t.run(async (ctx) => {
      const stream = await ctx.db
        .query('chatStreams')
        .withIndex('by_stream', (q) => q.eq('streamId', streamId))
        .first();
      if (!stream) throw new Error('Stream not found');
      await ctx.db.patch(stream._id, { usedAt: Date.now() });
    });

    const response = await t.fetch('/chat-stream', {
      method: 'POST',
      headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        streamId,
        token,
        messages: [],
      }),
    });

    expect(response.status).toBe(409);
  });
});
