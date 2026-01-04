import {convexTest} from 'convex-test';
import {describe, it, expect} from 'vitest';
import schema from '../../schema';

const getModules = () => import.meta.glob('../../**/*.ts');

describe('auth helpers', () => {
  describe('getCurrentUser', () => {
    it('returns null when not authenticated', async () => {
      const t = convexTest(schema, getModules());

      const user = await t.run(async (ctx) => {
        const {getCurrentUser} = await import('../../lib/auth');
        return await getCurrentUser(ctx);
      });

      expect(user).toBeNull();
    });

    it('returns user when authenticated', async () => {
      const t = convexTest(schema, getModules());

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          createdAt: Date.now(),
        });
      });

      const asUser = t.withIdentity({subject: userId});

      const user = await asUser.run(async (ctx) => {
        const {getCurrentUser} = await import('../../lib/auth');
        return await getCurrentUser(ctx);
      });

      expect(user?.name).toBe('Test User');
      expect(user?.email).toBe('test@example.com');
    });
  });

  describe('requireAuth', () => {
    it('throws when not authenticated', async () => {
      const t = convexTest(schema, getModules());

      await expect(
        t.run(async (ctx) => {
          const {requireAuth} = await import('../../lib/auth');
          return await requireAuth(ctx);
        })
      ).rejects.toThrow(/unauthorized/i);
    });

    it('returns userId when authenticated', async () => {
      const t = convexTest(schema, getModules());

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Test',
          email: 'test@example.com',
          createdAt: Date.now(),
        });
      });

      const asUser = t.withIdentity({subject: userId});

      const returnedId = await asUser.run(async (ctx) => {
        const {requireAuth} = await import('../../lib/auth');
        return await requireAuth(ctx);
      });

      expect(returnedId).toBe(userId);
    });
  });

  describe('requireAuthUser', () => {
    it('throws when not authenticated', async () => {
      const t = convexTest(schema, getModules());

      await expect(
        t.run(async (ctx) => {
          const {requireAuthUser} = await import('../../lib/auth');
          return await requireAuthUser(ctx);
        })
      ).rejects.toThrow(/unauthorized/i);
    });

    it('returns full user object when authenticated', async () => {
      const t = convexTest(schema, getModules());

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Full User',
          email: 'full@example.com',
          createdAt: Date.now(),
        });
      });

      const asUser = t.withIdentity({subject: userId});

      const user = await asUser.run(async (ctx) => {
        const {requireAuthUser} = await import('../../lib/auth');
        return await requireAuthUser(ctx);
      });

      expect(user.name).toBe('Full User');
      expect(user.email).toBe('full@example.com');
    });
  });
});
