import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { internal } from '../_generated/api';
import schema from '../schema';
import { MONTHLY_RESET_INTERVAL_MS } from '../lib/limits';

const getModules = () => import.meta.glob('../**/*.ts');

describe('usage', () => {
  it('treats stale extraction usage as reset during limit checks', async () => {
    const t = convexTest(schema, getModules());

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        name: 'Stale Usage',
        email: 'stale-usage@example.com',
        createdAt: Date.now(),
        usage: {
          llmExtractionsThisMonth: 20,
          chatMessagesThisMonth: 10,
          usageResetAt: Date.now() - MONTHLY_RESET_INTERVAL_MS - 1000,
        },
      });
    });

    const result = await t.query(internal.usage.checkExtractionLimit, { userId });
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.current).toBe(0);
    }
  });

  it('resets stale extraction usage before incrementing', async () => {
    const t = convexTest(schema, getModules());

    const staleResetAt = Date.now() - MONTHLY_RESET_INTERVAL_MS - 1000;
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        name: 'Increment User',
        email: 'increment-usage@example.com',
        createdAt: Date.now(),
        usage: {
          llmExtractionsThisMonth: 20,
          chatMessagesThisMonth: 12,
          usageResetAt: staleResetAt,
        },
      });
    });

    await t.mutation(internal.usage.incrementExtractionUsage, { userId });

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user?.usage?.llmExtractionsThisMonth).toBe(1);
    expect(user?.usage?.chatMessagesThisMonth).toBe(0);
    expect((user?.usage?.usageResetAt ?? 0) > staleResetAt).toBe(true);
  });

  it('treats stale chat usage as reset during chat limit checks', async () => {
    const t = convexTest(schema, getModules());

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        name: 'Chat Stale',
        email: 'chat-stale@example.com',
        createdAt: Date.now(),
        usage: {
          llmExtractionsThisMonth: 5,
          chatMessagesThisMonth: 50,
          usageResetAt: Date.now() - MONTHLY_RESET_INTERVAL_MS - 1000,
        },
      });
    });

    const result = await t.query(internal.usage.checkChatLimit, { userId });
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.current).toBe(0);
    }
  });

  it('cron reset mutation resets only stale persisted usage counters', async () => {
    const t = convexTest(schema, getModules());
    const staleResetAt = Date.now() - MONTHLY_RESET_INTERVAL_MS - 1000;

    const staleUserId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        name: 'Stale',
        email: 'stale@example.com',
        createdAt: Date.now(),
        usage: {
          llmExtractionsThisMonth: 12,
          chatMessagesThisMonth: 15,
          usageResetAt: staleResetAt,
        },
      });
    });

    const freshUserId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        name: 'Fresh',
        email: 'fresh@example.com',
        createdAt: Date.now(),
        usage: {
          llmExtractionsThisMonth: 3,
          chatMessagesThisMonth: 4,
          usageResetAt: Date.now(),
        },
      });
    });

    const noUsageUserId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        name: 'No Usage',
        email: 'no-usage@example.com',
        createdAt: Date.now(),
      });
    });

    const result = await t.mutation(internal.usage.resetStaleUsageCounters, {});
    expect(result.resetCount).toBe(1);

    const staleUser = await t.run(async (ctx) => ctx.db.get(staleUserId));
    expect(staleUser?.usage?.llmExtractionsThisMonth).toBe(0);
    expect(staleUser?.usage?.chatMessagesThisMonth).toBe(0);

    const freshUser = await t.run(async (ctx) => ctx.db.get(freshUserId));
    expect(freshUser?.usage?.llmExtractionsThisMonth).toBe(3);
    expect(freshUser?.usage?.chatMessagesThisMonth).toBe(4);

    const noUsageUser = await t.run(async (ctx) => ctx.db.get(noUsageUserId));
    expect(noUsageUser?.usage).toBeUndefined();
  });
});
