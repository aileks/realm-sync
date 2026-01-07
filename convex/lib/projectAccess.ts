import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { getAuthUserId } from './auth';

export type ProjectRole = 'owner' | null;

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
  return role === 'owner';
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
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  const project = await ctx.db.get(projectId);
  if (!project) return null;

  if (project.userId === userId) {
    return { project, role: 'owner' };
  }

  return null;
}
