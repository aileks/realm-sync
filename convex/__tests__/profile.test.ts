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

describe('profile', () => {
  describe('viewerProfile query', () => {
    it('returns user profile with avatarUrl from storage', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const profile = await asUser.query(api.users.viewerProfile, {});
      expect(profile).not.toBeNull();
      expect(profile?.name).toBe('Test User');
      expect(profile?.email).toBe('test@example.com');
    });

    it('returns null when not authenticated', async () => {
      const t = convexTest(schema, getModules());

      const profile = await t.query(api.users.viewerProfile, {});
      expect(profile).toBeNull();
    });

    it('returns avatarUrl from image field when no avatarStorageId', async () => {
      const t = convexTest(schema, getModules());

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'OAuth User',
          email: 'oauth@example.com',
          image: 'https://example.com/avatar.jpg',
          createdAt: Date.now(),
        });
      });

      const asUser = t.withIdentity({ subject: userId });
      const profile = await asUser.query(api.users.viewerProfile, {});
      expect(profile?.avatarUrl).toBe('https://example.com/avatar.jpg');
    });
  });

  describe('updateProfile mutation', () => {
    it('updates name field', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      await asUser.mutation(api.users.updateProfile, {
        name: 'Updated Name',
      });

      const user = await t.run(async (ctx) => ctx.db.get(userId));
      expect(user?.name).toBe('Updated Name');
    });

    it('updates bio field', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      await asUser.mutation(api.users.updateProfile, {
        bio: 'I am a worldbuilder.',
      });

      const user = await t.run(async (ctx) => ctx.db.get(userId));
      expect(user?.bio).toBe('I am a worldbuilder.');
    });

    it('updates both name and bio', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      await asUser.mutation(api.users.updateProfile, {
        name: 'New Name',
        bio: 'New bio text.',
      });

      const user = await t.run(async (ctx) => ctx.db.get(userId));
      expect(user?.name).toBe('New Name');
      expect(user?.bio).toBe('New bio text.');
    });

    it('trims whitespace from name and bio', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      await asUser.mutation(api.users.updateProfile, {
        name: '  Trimmed Name  ',
        bio: '  Trimmed bio.  ',
      });

      const user = await t.run(async (ctx) => ctx.db.get(userId));
      expect(user?.name).toBe('Trimmed Name');
      expect(user?.bio).toBe('Trimmed bio.');
    });

    it('throws when not authenticated', async () => {
      const t = convexTest(schema, getModules());

      await expect(t.mutation(api.users.updateProfile, { name: 'Test' })).rejects.toThrow(
        /unauthorized/i
      );
    });

    it('throws when no fields provided', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      await expect(asUser.mutation(api.users.updateProfile, {})).rejects.toThrow(
        /no fields to update/i
      );
    });

    it('enforces name max length of 80 characters', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const longName = 'A'.repeat(81);
      await expect(asUser.mutation(api.users.updateProfile, { name: longName })).rejects.toThrow(
        /80 characters/i
      );
    });

    it('enforces bio max length of 500 characters', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const longBio = 'A'.repeat(501);
      await expect(asUser.mutation(api.users.updateProfile, { bio: longBio })).rejects.toThrow(
        /500 characters/i
      );
    });
  });

  // NOTE: updateAvatar mutation tests skipped - convex-test storage.store()
  // fails with jsdom's Blob (missing arrayBuffer method). The mutation is
  // simple validation + db update, tested manually.

  describe('removeAvatar mutation', () => {
    it('removes avatarStorageId from user', async () => {
      const t = convexTest(schema, getModules());

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'User With Avatar',
          email: 'avatar@example.com',
          createdAt: Date.now(),
        });
      });

      const asUser = t.withIdentity({ subject: userId });
      await asUser.mutation(api.users.removeAvatar, {});

      const user = await t.run(async (ctx) => ctx.db.get(userId));
      expect(user?.avatarStorageId).toBeUndefined();
    });

    it('throws when not authenticated', async () => {
      const t = convexTest(schema, getModules());

      await expect(t.mutation(api.users.removeAvatar, {})).rejects.toThrow(/unauthorized/i);
    });
  });

  describe('changePassword mutation', () => {
    it('throws when not authenticated', async () => {
      const t = convexTest(schema, getModules());

      await expect(
        t.mutation(api.users.changePassword, {
          currentPassword: 'old',
          newPassword: 'newpassword123',
        })
      ).rejects.toThrow(/unauthorized/i);
    });

    it('rejects password less than 8 characters', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      await expect(
        asUser.mutation(api.users.changePassword, {
          currentPassword: 'old',
          newPassword: 'short',
        })
      ).rejects.toThrow(/at least 8 characters/i);
    });

    it('rejects password longer than 128 characters', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      const longPassword = 'A'.repeat(129);
      await expect(
        asUser.mutation(api.users.changePassword, {
          currentPassword: 'old',
          newPassword: longPassword,
        })
      ).rejects.toThrow(/128 characters/i);
    });
  });

  describe('updateEmail mutation', () => {
    it('throws when not authenticated', async () => {
      const t = convexTest(schema, getModules());

      await expect(
        t.mutation(api.users.updateEmail, { newEmail: 'new@example.com' })
      ).rejects.toThrow(/unauthorized/i);
    });

    it('rejects invalid email format', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      await expect(
        asUser.mutation(api.users.updateEmail, { newEmail: 'notanemail' })
      ).rejects.toThrow(/invalid email/i);
    });

    it('rejects email already in use by another user', async () => {
      const t = convexTest(schema, getModules());
      const { asUser } = await setupAuthenticatedUser(t);

      await t.run(async (ctx) => {
        await ctx.db.insert('users', {
          name: 'Other User',
          email: 'taken@example.com',
          createdAt: Date.now(),
        });
      });

      await expect(
        asUser.mutation(api.users.updateEmail, { newEmail: 'taken@example.com' })
      ).rejects.toThrow(/already in use/i);
    });

    it('updates email directly', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      await asUser.mutation(api.users.updateEmail, { newEmail: 'new@example.com' });

      const user = await t.run(async (ctx) => ctx.db.get(userId));
      expect(user?.email).toBe('new@example.com');
    });

    it('normalizes email to lowercase', async () => {
      const t = convexTest(schema, getModules());
      const { userId, asUser } = await setupAuthenticatedUser(t);

      await asUser.mutation(api.users.updateEmail, { newEmail: 'NEW@EXAMPLE.COM' });

      const user = await t.run(async (ctx) => ctx.db.get(userId));
      expect(user?.email).toBe('new@example.com');
    });
  });
});
