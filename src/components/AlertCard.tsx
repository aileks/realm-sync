import { Link } from '@tanstack/react-router';
import { AlertTriangle, Clock, HelpCircle, Check, X, Quote } from 'lucide-react';
import { Card, CardHeader, CardAction } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Doc, Id } from '../../convex/_generated/dataModel';

type Alert = Doc<'alerts'>;

type AlertCardProps = {
  alert: Alert;
  projectId: string;
  onResolve: (id: Id<'alerts'>) => void;
  onDismiss: (id: Id<'alerts'>) => void;
  entityNames?: string[];
};

const typeConfig = {
  contradiction: { icon: AlertTriangle, label: 'Contradiction' },
  timeline: { icon: Clock, label: 'Timeline Issue' },
  ambiguity: { icon: HelpCircle, label: 'Ambiguity' },
} as const;

const severityConfig = {
  error: {
    badge: 'bg-red-500/15 text-red-600 dark:text-red-400 ring-red-500/20',
    label: 'Error',
  },
  warning: {
    badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/20',
    label: 'Warning',
  },
} as const;

export function AlertCard({ alert, projectId, onResolve, onDismiss, entityNames }: AlertCardProps) {
  const TypeIcon = typeConfig[alert.type].icon;
  const severityStyle = severityConfig[alert.severity];

  return (
    <Link
      to="/projects/$projectId/alerts/$alertId"
      params={{ projectId, alertId: alert._id }}
      className="block"
    >
      <Card
        className={cn(
          'group transition-all duration-200 hover:shadow-md hover:ring-1',
          alert.status === 'open' ?
            'hover:border-primary/50 hover:ring-primary/20'
          : 'opacity-60 hover:opacity-80'
        )}
      >
        <CardHeader className="p-4">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-lg',
                alert.severity === 'error' ? 'bg-red-500/10' : 'bg-amber-500/10'
              )}
            >
              <TypeIcon
                className={cn(
                  'size-5',
                  alert.severity === 'error' ?
                    'text-red-600 dark:text-red-400'
                  : 'text-amber-600 dark:text-amber-400'
                )}
              />
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-serif text-sm leading-snug font-medium">{alert.title}</h3>
                <Badge
                  variant="outline"
                  className={cn(
                    'h-5 shrink-0 border-transparent px-1.5 text-[10px] font-normal ring-1',
                    severityStyle.badge
                  )}
                >
                  {severityStyle.label}
                </Badge>
              </div>

              <p className="text-muted-foreground line-clamp-2 text-xs">{alert.description}</p>

              {entityNames && entityNames.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {entityNames.map((name) => (
                    <Badge
                      key={name}
                      variant="outline"
                      className="text-muted-foreground h-5 px-1.5 text-[10px] font-normal"
                    >
                      {name}
                    </Badge>
                  ))}
                </div>
              )}

              {alert.evidence.length > 0 && (
                <div className="border-border/50 bg-muted/30 relative rounded-lg border p-3 pl-9">
                  <Quote className="text-muted-foreground/50 absolute top-3 left-3 size-3.5" />
                  <p className="text-muted-foreground line-clamp-2 font-mono text-xs leading-relaxed">
                    "{alert.evidence[0].snippet}"
                  </p>
                  {alert.evidence.length > 1 && (
                    <p className="text-muted-foreground/70 mt-1 text-[10px]">
                      +{alert.evidence.length - 1} more evidence
                    </p>
                  )}
                </div>
              )}

              {alert.suggestedFix && (
                <p className="text-muted-foreground/80 text-xs italic">
                  Suggestion: {alert.suggestedFix}
                </p>
              )}
            </div>

            {alert.status === 'open' && (
              <CardAction className="flex shrink-0 gap-1 opacity-80 transition-opacity group-hover:opacity-100">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground size-8 p-0 hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400"
                  onClick={() => onResolve(alert._id)}
                  title="Mark as resolved"
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive size-8 p-0"
                  onClick={() => onDismiss(alert._id)}
                  title="Dismiss alert"
                >
                  <X className="size-4" />
                </Button>
              </CardAction>
            )}
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
