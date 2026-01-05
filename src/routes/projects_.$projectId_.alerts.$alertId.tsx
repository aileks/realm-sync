import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { useState } from 'react';
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  HelpCircle,
  Check,
  X,
  FileText,
  Quote,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id, Doc } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoadingState } from '@/components/LoadingState';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/projects_/$projectId_/alerts/$alertId')({
  component: AlertDetailPage,
});

type AlertType = Doc<'alerts'>['type'];
type AlertSeverity = Doc<'alerts'>['severity'];

const typeConfig: Record<AlertType, { icon: typeof AlertTriangle; label: string; color: string }> =
  {
    contradiction: { icon: AlertTriangle, label: 'Contradiction', color: 'text-red-600' },
    timeline: { icon: Clock, label: 'Timeline Issue', color: 'text-amber-600' },
    ambiguity: { icon: HelpCircle, label: 'Ambiguity', color: 'text-blue-600' },
  };

const severityConfig: Record<AlertSeverity, { badge: string; label: string }> = {
  error: {
    badge: 'bg-red-500/15 text-red-600 dark:text-red-400 ring-red-500/20',
    label: 'Error',
  },
  warning: {
    badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/20',
    label: 'Warning',
  },
};

function AlertDetailPage() {
  const navigate = useNavigate();
  const { projectId, alertId } = Route.useParams();

  const alertData = useQuery(api.alerts.getWithDetails, { id: alertId as Id<'alerts'> });
  const project = useQuery(api.projects.get, { id: projectId as Id<'projects'> });

  const resolveAlert = useMutation(api.alerts.resolve);
  const dismissAlert = useMutation(api.alerts.dismiss);
  const reopenAlert = useMutation(api.alerts.reopen);
  const resolveWithCanonUpdate = useMutation(api.alerts.resolveWithCanonUpdate);

  const [resolutionNote, setResolutionNote] = useState('');
  const [newFactValue, setNewFactValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (alertData === undefined || project === undefined) {
    return <LoadingState message="Loading alert details..." />;
  }

  if (alertData === null || project === null) {
    return (
      <div className="container mx-auto p-6 text-center">
        <p className="text-muted-foreground">Alert not found.</p>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => navigate({ to: '/projects/$projectId/alerts', params: { projectId } })}
        >
          Back to Alerts
        </Button>
      </div>
    );
  }

  const { alert, entities, facts, document: alertDocument } = alertData;
  const TypeIcon = typeConfig[alert.type].icon;
  const severityStyle = severityConfig[alert.severity];
  const linkedFacts = facts.filter((f): f is NonNullable<typeof f> => f !== null);

  const handleResolve = async () => {
    setIsSubmitting(true);
    try {
      await resolveAlert({
        id: alert._id,
        resolutionNotes: resolutionNote || undefined,
      });
      void navigate({ to: '/projects/$projectId/alerts', params: { projectId } });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    setIsSubmitting(true);
    try {
      await dismissAlert({ id: alert._id });
      void navigate({ to: '/projects/$projectId/alerts', params: { projectId } });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReopen = async () => {
    setIsSubmitting(true);
    try {
      await reopenAlert({ id: alert._id });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCanon = async (factId: Id<'facts'>) => {
    if (!newFactValue.trim()) return;
    setIsSubmitting(true);
    try {
      await resolveWithCanonUpdate({
        id: alert._id,
        factId,
        newValue: newFactValue.trim(),
        resolutionNotes: resolutionNote || undefined,
      });
      void navigate({ to: '/projects/$projectId/alerts', params: { projectId } });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canonEvidence = alert.evidence.filter((e) => e.documentTitle === 'Canon');
  const newDocEvidence = alert.evidence.filter((e) => e.documentTitle !== 'Canon');

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2"
          onClick={() => navigate({ to: '/projects/$projectId/alerts', params: { projectId } })}
        >
          <ArrowLeft className="mr-1 size-4" />
          Back to Alerts
        </Button>
      </div>

      <div className="mb-8">
        <div className="mb-4 flex items-start gap-4">
          <div
            className={cn(
              'flex size-12 shrink-0 items-center justify-center rounded-xl',
              alert.severity === 'error' ? 'bg-red-500/10' : 'bg-amber-500/10'
            )}
          >
            <TypeIcon className={cn('size-6', typeConfig[alert.type].color)} />
          </div>
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <h1 className="font-serif text-2xl font-bold">{alert.title}</h1>
              <Badge
                variant="outline"
                className={cn(
                  'h-6 border-transparent px-2 text-xs font-normal ring-1',
                  severityStyle.badge
                )}
              >
                {severityStyle.label}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  'h-6 px-2 text-xs font-normal',
                  alert.status === 'open' ? 'border-primary/30 text-primary'
                  : alert.status === 'resolved' ? 'border-green-500/30 text-green-600'
                  : 'border-muted text-muted-foreground'
                )}
              >
                {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
              </Badge>
            </div>
            <p className="text-muted-foreground">{alert.description}</p>
          </div>
        </div>

        {entities && entities.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="text-muted-foreground text-sm">Affected:</span>
            {entities.map((entity) =>
              entity ?
                <Link
                  key={entity._id}
                  to="/entities/$entityId"
                  params={{ entityId: entity._id }}
                  search={{ project: projectId }}
                  className="hover:bg-muted rounded-md px-2 py-1 text-sm font-medium transition-colors"
                >
                  {entity.name}
                </Link>
              : null
            )}
          </div>
        )}
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="text-muted-foreground size-4" />
              <h2 className="font-serif text-lg font-semibold">Established Canon</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {canonEvidence.length > 0 ?
              canonEvidence.map((evidence, idx) => (
                <div
                  key={idx}
                  className="border-border/50 bg-muted/30 relative rounded-lg border p-4 pl-10"
                >
                  <Quote className="text-muted-foreground/50 absolute top-4 left-4 size-4" />
                  <p className="font-mono text-sm leading-relaxed">"{evidence.snippet}"</p>
                </div>
              ))
            : <p className="text-muted-foreground text-sm italic">No canon evidence recorded.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="text-muted-foreground size-4" />
                <h2 className="font-serif text-lg font-semibold">New Document</h2>
              </div>
              {alertDocument && (
                <Link
                  to="/projects/$projectId/documents/$documentId"
                  params={{ projectId, documentId: alert.documentId }}
                  className="text-muted-foreground hover:text-primary flex items-center gap-1 text-xs transition-colors"
                >
                  Edit
                  <ExternalLink className="size-3" />
                </Link>
              )}
            </div>
            {alertDocument && (
              <p className="text-muted-foreground text-xs">{alertDocument.title}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {newDocEvidence.length > 0 ?
              newDocEvidence.map((evidence, idx) => (
                <div
                  key={idx}
                  className="border-border/50 bg-muted/30 relative rounded-lg border p-4 pl-10"
                >
                  <Quote className="text-muted-foreground/50 absolute top-4 left-4 size-4" />
                  <p className="font-mono text-sm leading-relaxed">"{evidence.snippet}"</p>
                  <p className="text-muted-foreground/70 mt-2 text-xs">{evidence.documentTitle}</p>
                </div>
              ))
            : <p className="text-muted-foreground text-sm italic">
                No new document evidence recorded.
              </p>
            }
          </CardContent>
        </Card>
      </div>

      {alert.suggestedFix && (
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <h2 className="font-serif text-lg font-semibold">Suggested Resolution</h2>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{alert.suggestedFix}</p>
          </CardContent>
        </Card>
      )}

      {alert.status === 'open' ?
        <Card>
          <CardHeader className="pb-2">
            <h2 className="font-serif text-lg font-semibold">Take Action</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {linkedFacts.length > 0 && (
              <div className="border-border bg-muted/20 space-y-3 rounded-lg border p-4">
                <p className="text-sm font-medium">Update Canon Fact</p>
                <p className="text-muted-foreground text-xs">
                  Change the established fact to match the new document:
                </p>
                {linkedFacts.map((fact) => (
                  <div key={fact._id} className="space-y-2">
                    <p className="text-muted-foreground text-xs">
                      {fact.subject} {fact.predicate}{' '}
                      <span className="line-through">{fact.object}</span>
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="New value..."
                        value={newFactValue}
                        onChange={(e) => setNewFactValue(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleUpdateCanon(fact._id)}
                        disabled={isSubmitting || !newFactValue.trim()}
                      >
                        Update Canon
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Textarea
              placeholder="Add a note about how you resolved this (optional)..."
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              rows={3}
            />
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleResolve} disabled={isSubmitting}>
                <Check className="mr-1.5 size-4" />
                Mark as Resolved
              </Button>
              <Button variant="outline" onClick={handleDismiss} disabled={isSubmitting}>
                <X className="mr-1.5 size-4" />
                Dismiss (Intentional)
              </Button>
              {alertDocument && (
                <Link
                  to="/projects/$projectId/documents/$documentId"
                  params={{ projectId, documentId: alert.documentId }}
                >
                  <Button variant="outline">
                    <FileText className="mr-1.5 size-4" />
                    Edit Document
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      : <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-muted-foreground text-sm">
                This alert was{' '}
                <span className="font-medium">
                  {alert.status === 'resolved' ? 'resolved' : 'dismissed'}
                </span>
                {alert.resolvedAt && <> on {new Date(alert.resolvedAt).toLocaleDateString()}</>}
              </p>
              {alert.resolutionNotes && (
                <p className="text-muted-foreground mt-1 text-sm italic">
                  "{alert.resolutionNotes}"
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleReopen} disabled={isSubmitting}>
              Reopen Alert
            </Button>
          </CardContent>
        </Card>
      }
    </div>
  );
}
