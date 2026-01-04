import { createFileRoute, Outlet, Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { ArrowLeft, Search, BookOpen, Clock } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/LoadingState';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/projects_/$projectId_/canon')({
  component: CanonLayout,
});

function CanonLayout() {
  const navigate = useNavigate();
  const { projectId } = Route.useParams();
  const project = useQuery(api.projects.get, { id: projectId as Id<'projects'> });

  if (project === undefined) {
    return <LoadingState message="Loading project..." />;
  }

  if (project === null) {
    return (
      <div className="container mx-auto p-6 text-center">
        <p className="text-muted-foreground">Project not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate({ to: '/projects' })}>
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2"
          onClick={() => navigate({ to: '/projects/$projectId', params: { projectId } })}
        >
          <ArrowLeft className="mr-1 size-4" />
          {project.name}
        </Button>
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-3xl font-bold">Canon Browser</h1>
          <nav className="flex gap-1">
            <NavLink to="/projects/$projectId/canon" params={{ projectId }} end>
              <BookOpen className="size-4" />
              Browse
            </NavLink>
            <NavLink to="/projects/$projectId/canon/timeline" params={{ projectId }}>
              <Clock className="size-4" />
              Timeline
            </NavLink>
            <NavLink to="/projects/$projectId/canon/search" params={{ projectId }}>
              <Search className="size-4" />
              Search
            </NavLink>
          </nav>
        </div>
      </div>
      <Outlet />
    </div>
  );
}

type NavLinkProps = {
  to: string;
  params: Record<string, string>;
  children: React.ReactNode;
  end?: boolean;
};

function NavLink({ to, params, children, end }: NavLinkProps) {
  return (
    <Link
      to={to}
      params={params}
      activeOptions={{ exact: end }}
      className={cn(
        'text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        'data-[status=active]:bg-primary/10 data-[status=active]:text-primary'
      )}
    >
      {children}
    </Link>
  );
}
