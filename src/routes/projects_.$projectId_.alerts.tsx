import { createFileRoute, Outlet, useMatches, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { useState, useMemo } from 'react';
import { AlertTriangle, ArrowLeft, CheckCheck, XCircle } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { AlertCard } from '@/components/AlertCard';
import { AlertFilters } from '@/components/AlertFilters';

const ALERT_DETAIL_ROUTE_ID = '/projects_/$projectId_/alerts/$alertId';

export const Route = createFileRoute('/projects_/$projectId_/alerts')({
  component: AlertsRoute,
});

type AlertStatus = 'open' | 'resolved' | 'dismissed';
type AlertType = 'contradiction' | 'timeline' | 'ambiguity';
type AlertSeverity = 'error' | 'warning';

function AlertsRoute() {
  const matches = useMatches();
  const isDetailView = matches.some((match) => match.routeId === ALERT_DETAIL_ROUTE_ID);

  if (isDetailView) {
    return <Outlet />;
  }

  return <AlertsPage />;
}

function AlertsPage() {
  const navigate = useNavigate();
  const { projectId } = Route.useParams();
  const project = useQuery(api.projects.get, { id: projectId as Id<'projects'> });
  const alerts = useQuery(api.alerts.listByProject, { projectId: projectId as Id<'projects'> });
  const entities = useQuery(api.entities.listByProject, { projectId: projectId as Id<'projects'> });

  const resolveAlert = useMutation(api.alerts.resolve);
  const dismissAlert = useMutation(api.alerts.dismiss);
  const resolveAll = useMutation(api.alerts.resolveAll);
  const dismissAll = useMutation(api.alerts.dismissAll);

  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('open');
  const [typeFilter, setTypeFilter] = useState<AlertType | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');

  const entityNameMap = useMemo(() => {
    if (!entities) return new Map<string, string>();
    return new Map(entities.map((e) => [e._id, e.name]));
  }, [entities]);

  const filteredAlerts = useMemo(() => {
    if (!alerts) return [];
    return alerts.filter((alert) => {
      const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
      const matchesType = typeFilter === 'all' || alert.type === typeFilter;
      const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
      return matchesStatus && matchesType && matchesSeverity;
    });
  }, [alerts, statusFilter, typeFilter, severityFilter]);

  const highlightAlertId = useMemo(() => {
    const openAlert = filteredAlerts.find((alert) => alert.status === 'open');
    return openAlert?._id ?? filteredAlerts[0]?._id;
  }, [filteredAlerts]);

  const counts = useMemo(() => {
    if (!alerts) return undefined;
    return {
      status: {
        all: alerts.length,
        open: alerts.filter((a) => a.status === 'open').length,
        resolved: alerts.filter((a) => a.status === 'resolved').length,
        dismissed: alerts.filter((a) => a.status === 'dismissed').length,
      },
      type: {
        all: alerts.length,
        contradiction: alerts.filter((a) => a.type === 'contradiction').length,
        timeline: alerts.filter((a) => a.type === 'timeline').length,
        ambiguity: alerts.filter((a) => a.type === 'ambiguity').length,
      },
      severity: {
        all: alerts.length,
        error: alerts.filter((a) => a.severity === 'error').length,
        warning: alerts.filter((a) => a.severity === 'warning').length,
      },
    };
  }, [alerts]);

  const openCount = counts?.status.open ?? 0;

  if (project === undefined || alerts === undefined) {
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

  const handleResolve = (id: Id<'alerts'>) => {
    void resolveAlert({ id });
  };

  const handleDismiss = (id: Id<'alerts'>) => {
    void dismissAlert({ id });
  };

  const handleResolveAll = () => {
    void resolveAll({ projectId: projectId as Id<'projects'> });
  };

  const handleDismissAll = () => {
    void dismissAll({ projectId: projectId as Id<'projects'> });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 space-y-3">
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2"
          onClick={() => navigate({ to: '/projects/$projectId', params: { projectId } })}
        >
          <ArrowLeft className="mr-1 size-4" />
          {project.name}
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-3xl font-bold">Alerts & Consistency</h1>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-muted-foreground text-sm">
              {alerts.length} total • {filteredAlerts.length} visible
            </div>
            {openCount > 0 && statusFilter === 'open' && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleResolveAll}>
                  <CheckCheck className="mr-1.5 size-4" />
                  Resolve All
                </Button>
                <Button variant="outline" size="sm" onClick={handleDismissAll}>
                  <XCircle className="mr-1.5 size-4" />
                  Dismiss All
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <AlertFilters
          statusFilter={statusFilter}
          typeFilter={typeFilter}
          severityFilter={severityFilter}
          onStatusChange={setStatusFilter}
          onTypeChange={setTypeFilter}
          onSeverityChange={setSeverityFilter}
          counts={counts}
        />
      </div>

      {alerts.length === 0 ?
        <EmptyState
          icon={<AlertTriangle className="text-muted-foreground size-8" />}
          title="No alerts found"
          description="Consistency checks will appear here when the analysis engine detects contradictions or timeline errors."
        />
      : filteredAlerts.length === 0 ?
        <EmptyState
          title="No matching alerts"
          description="Try adjusting your filters to see more alerts."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setStatusFilter('all');
                setTypeFilter('all');
                setSeverityFilter('all');
              }}
            >
              Clear Filters
            </Button>
          }
        />
      : <div className="grid gap-4" data-tour="alerts-list">
          {filteredAlerts.map((alert) => (
            <AlertCard
              key={alert._id}
              alert={alert}
              projectId={projectId}
              onResolve={handleResolve}
              onDismiss={handleDismiss}
              entityNames={alert.entityIds.map((id) => entityNameMap.get(id) ?? 'Unknown')}
              dataTourAction={alert._id === highlightAlertId && alert.status === 'open'}
            />
          ))}
        </div>
      }
    </div>
  );
}
