import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { FolderOpen, History } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type RecentProject = {
  id: string;
  name: string;
  visitedAt: number;
};

type RecentProjectsProps = {
  collapsed: boolean;
  isAuthenticated: boolean;
  userId?: string;
};

const MAX_RECENT_PROJECTS = 5;
const RECENT_PROJECTS_EVENT = 'realm-sync:recent-projects-updated';
const recentProjectsByUser = new Map<string, RecentProject[]>();

function getRecentProjects(userId?: string) {
  if (!userId) return [];
  return recentProjectsByUser.get(userId) ?? [];
}

export function addRecentProject(userId: string | undefined, id: string, name: string) {
  if (typeof window === 'undefined' || !userId) return;
  const recent = getRecentProjects(userId).filter((project) => project.id !== id);
  const updated = [{ id, name, visitedAt: Date.now() }, ...recent].slice(0, MAX_RECENT_PROJECTS);
  recentProjectsByUser.set(userId, updated);
  window.dispatchEvent(new CustomEvent(RECENT_PROJECTS_EVENT, { detail: { userId } }));
}

export function RecentProjects({ collapsed, isAuthenticated, userId }: RecentProjectsProps) {
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setRecentProjects([]);
      return;
    }
    setRecentProjects(getRecentProjects(userId));
  }, [isAuthenticated, userId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !userId) return;

    function handleUpdate(event: Event) {
      const detail = (event as CustomEvent<{ userId?: string }>).detail;
      if (detail?.userId !== userId) return;
      setRecentProjects(getRecentProjects(userId));
    }

    window.addEventListener(RECENT_PROJECTS_EVENT, handleUpdate);
    return () => window.removeEventListener(RECENT_PROJECTS_EVENT, handleUpdate);
  }, [userId]);

  if (!isAuthenticated || !userId || recentProjects.length === 0) return null;

  return (
    <>
      <div className="my-4 px-2">
        <div className="border-sidebar-border border-t" />
      </div>

      {!collapsed && (
        <p className="text-muted-foreground mb-2 px-3 font-mono text-[10px] tracking-widest uppercase">
          <History className="mr-1 inline size-3" />
          Recent
        </p>
      )}

      {recentProjects.slice(0, collapsed ? 3 : 5).map((project) => {
        const content = (
          <Link
            key={project.id}
            to="/projects/$projectId"
            params={{ projectId: project.id }}
            className={cn(
              'flex items-center gap-3 rounded-lg p-2 transition-colors',
              collapsed && 'justify-center',
              'hover:bg-predicate/20 text-foreground text-sm'
            )}
          >
            <FolderOpen className="size-4 opacity-60" />
            {!collapsed && <span className="truncate text-xs">{project.name}</span>}
          </Link>
        );

        if (collapsed) {
          return (
            <Tooltip key={project.id}>
              <TooltipTrigger render={content} />
              <TooltipContent side="right">{project.name}</TooltipContent>
            </Tooltip>
          );
        }

        return content;
      })}
    </>
  );
}
