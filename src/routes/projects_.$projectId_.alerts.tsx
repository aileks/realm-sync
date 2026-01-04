import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';

export const Route = createFileRoute('/projects_/$projectId_/alerts')({
  component: AlertsPage,
});

function AlertsPage() {
  const navigate = useNavigate();
  const { projectId } = Route.useParams();
  const project = useQuery(api.projects.get, { id: projectId as Id<'projects'> });

  // Note: API for listing alerts is not yet available in Phase 3
  // const alerts = useQuery(api.alerts.listByProject, { projectId: projectId as Id<'projects'> });

  if (project === undefined) {
    return <LoadingState message="Loading alerts..." />;
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
        <h1 className="font-serif text-3xl font-bold">Alerts & Consistency</h1>
      </div>

      <EmptyState
        icon={<AlertTriangle className="text-muted-foreground size-8" />}
        title="No alerts found"
        description="Consistency checks will appear here when the analysis engine detects contradictions or timeline errors."
      />
    </div>
  );
}
