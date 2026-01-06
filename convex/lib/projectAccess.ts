import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { getAuthUserId } from './auth';

export type ProjectRole = 'owner' | 'editor' | 'viewer' | null;

export async function getProjectRole(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<'projects'>
): Promise<ProjectRole> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  const project = await ctx.db.get(projectId);
  if (!project) return null;

  if (project.userId === userId) {
    return 'owner';
  }

  const share = await ctx.db
    .query('projectShares')
    .withIndex('by_user', (q) => q.eq('sharedWithUserId', userId))
    .filter((q) => q.eq(q.field('projectId'), projectId))
    .filter((q) => q.neq(q.field('acceptedAt'), undefined))
    .first();

  if (share) {
    return share.role;
  }

  return null;
}

export async function canReadProject(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<'projects'>
): Promise<boolean> {
  const role = await getProjectRole(ctx, projectId);
  return role !== null;
}

export async function canEditProject(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<'projects'>
): Promise<boolean> {
  const role = await getProjectRole(ctx, projectId);
  return role === 'owner' || role === 'editor';
}

export async function isProjectOwner(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<'projects'>
): Promise<boolean> {
  const role = await getProjectRole(ctx, projectId);
  return role === 'owner';
}

export async function getProjectWithRole(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<'projects'>
): Promise<{ project: Doc<'projects'>; role: ProjectRole } | null> {
  const role = await getProjectRole(ctx, projectId);
  if (!role) return null;

  const project = await ctx.db.get(projectId);
  if (!project) return null;

  return { project, role };
}
