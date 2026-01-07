import { internalMutation } from './_generated/server';

/**
 * Migration: Add noteCount to project stats
 *
 * This migration adds the missing `noteCount` field to all existing projects.
 * Run this once after deploying the schema changes.
 */
export const migrateAddNoteCount = internalMutation({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query('projects').collect();

    let migrated = 0;
    for (const project of projects) {
      if (project.stats && !('noteCount' in project.stats)) {
        await ctx.db.patch(project._id, {
          stats: {
            ...project.stats,
            noteCount: 0,
          },
        });
        migrated++;
      }
    }

    console.log(`Migrated ${migrated} projects to include noteCount`);
    return { migrated };
  },
});

/**
 * Migration: Add projectType to all projects (defaults to 'general')
 */
export const migrateAddProjectType = internalMutation({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query('projects').collect();

    let migrated = 0;
    for (const project of projects) {
      if (!project.projectType) {
        await ctx.db.patch(project._id, {
          projectType: 'general',
        });
        migrated++;
      }
    }

    console.log(`Migrated ${migrated} projects to include projectType`);
    return { migrated };
  },
});

/**
 * Migration: Add revealedToViewers to all entities (defaults to false/hidden)
 * This only affects TTRPG projects, but we add it to all for consistency
 */
export const migrateAddRevealFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    const entities = await ctx.db.query('entities').collect();

    let migrated = 0;
    for (const entity of entities) {
      if (entity.revealedToViewers === undefined) {
        await ctx.db.patch(entity._id, {
          revealedToViewers: false,
        });
        migrated++;
      }
    }

    console.log(`Migrated ${migrated} entities to include revealedToViewers`);
    return { migrated };
  },
});

export const cleanupOrphanedAuthData = internalMutation({
  args: {},
  handler: async (ctx) => {
    let totalDeleted = 0;
    const startTime = Date.now();

    console.log('[cleanupOrphanedAuthData] Starting cleanup...');

    const users = await ctx.db.query('users').collect();

    const validUserIds = new Set(users.map((u) => u._id));

    const orphanedSessions = await ctx.db
      .query('authSessions')
      .collect()
      .then((sessions) => sessions.filter((s) => !validUserIds.has(s.userId)));

    const orphanedAccounts = await ctx.db
      .query('authAccounts')
      .collect()
      .then((accounts) => accounts.filter((a) => !validUserIds.has(a.userId)));

    const sessionIds = new Set(orphanedSessions.map((s) => s._id));
    const accountIds = new Set(orphanedAccounts.map((a) => a._id));

    const orphanedRefreshTokens = await ctx.db
      .query('authRefreshTokens')
      .collect()
      .then((tokens) => tokens.filter((t) => sessionIds.has(t.sessionId)));

    const orphanedVerificationCodes = await ctx.db
      .query('authVerificationCodes')
      .collect()
      .then((codes) => codes.filter((c) => accountIds.has(c.accountId)));

    const orphanedVerifiers = await ctx.db
      .query('authVerifiers')
      .collect()
      .then((verifiers) => verifiers.filter((v) => v.sessionId && sessionIds.has(v.sessionId)));

    await Promise.all(orphanedRefreshTokens.map((t) => ctx.db.delete(t._id)));
    await Promise.all(orphanedVerificationCodes.map((c) => ctx.db.delete(c._id)));
    await Promise.all(orphanedVerifiers.map((v) => ctx.db.delete(v._id)));
    await Promise.all(orphanedSessions.map((s) => ctx.db.delete(s._id)));
    await Promise.all(orphanedAccounts.map((a) => ctx.db.delete(a._id)));

    totalDeleted =
      orphanedRefreshTokens.length +
      orphanedVerificationCodes.length +
      orphanedVerifiers.length +
      orphanedSessions.length +
      orphanedAccounts.length;

    const duration = Date.now() - startTime;

    console.log(`[cleanupOrphanedAuthData] Completed in ${duration}ms`, {
      refreshTokens: orphanedRefreshTokens.length,
      verificationCodes: orphanedVerificationCodes.length,
      verifiers: orphanedVerifiers.length,
      sessions: orphanedSessions.length,
      accounts: orphanedAccounts.length,
      totalDeleted,
      duration,
    });

    return {
      refreshTokensDeleted: orphanedRefreshTokens.length,
      verificationCodesDeleted: orphanedVerificationCodes.length,
      accountsDeleted: orphanedAccounts.length,
      sessionsDeleted: orphanedSessions.length,
      totalDeleted,
      duration,
    };
  },
});
