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
