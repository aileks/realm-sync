import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { api } from '../_generated/api';
import { register as registerPersistentTextStreaming } from '@convex-dev/persistent-text-streaming/test';
import schema from '../schema';

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

    await expect(t.mutation(api.chat.createStreamingChat, { messages: [] })).rejects.toThrow(
      /unauthorized/i
    );
  });

  it('binds stream access to the authenticated user', async () => {
    const t = convexTest(schema, getModules());
    registerPersistentTextStreaming(t);
    const { asUser } = await setupAuthenticatedUser(t);
    const { asUser: otherUser } = await setupAuthenticatedUser(t);

    const { streamId } = await asUser.mutation(api.chat.createStreamingChat, { messages: [] });

    await expect(otherUser.query(api.chat.getStreamBody, { streamId })).rejects.toThrow(
      /unauthorized/i
    );
  });

  it('blocks sendMessage without auth', async () => {
    const t = convexTest(schema, getModules());
    registerPersistentTextStreaming(t);

    await expect(
      t.action(api.chat.sendMessage, {
        messages: [{ role: 'user', content: 'Hello' }],
      })
    ).rejects.toThrow(/unauthorized/i);
  });
});
