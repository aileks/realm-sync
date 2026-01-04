import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Calendar, FileText, AlertTriangle } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/projects_/$projectId_/canon/timeline')({
  component: CanonTimeline,
});

type EventWithDocument = {
  _id: Id<'entities'>;
  _creationTime: number;
  projectId: Id<'projects'>;
  name: string;
  type: 'character' | 'location' | 'item' | 'concept' | 'event';
  description?: string;
  aliases: string[];
  status: 'pending' | 'confirmed';
  createdAt: number;
  updatedAt: number;
  firstMentionedIn?: Id<'documents'>;
  document: { _id: Id<'documents'>; title: string; orderIndex: number } | null;
};

function CanonTimeline() {
  const { projectId } = Route.useParams();

  const events = useQuery(api.entities.listEvents, {
    projectId: projectId as Id<'projects'>,
  });

  if (events === undefined) {
    return <LoadingState message="Loading timeline..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Timeline ordering is based on document order and may not reflect actual chronology within
          your story.
        </p>
      </div>

      {events.length === 0 ?
        <EmptyState
          title="No events yet"
          description="Events will appear here as you add documents and extract canon. Events are entities with type 'event'."
        />
      : <div className="relative">
          <div className="bg-border absolute top-0 bottom-0 left-4 w-px" />

          <div className="space-y-6">
            {events.map((event, index) => (
              <TimelineEvent
                key={event._id}
                event={event}
                isFirst={index === 0}
                isLast={index === events.length - 1}
                projectId={projectId}
              />
            ))}
          </div>
        </div>
      }
    </div>
  );
}

type TimelineEventProps = {
  event: EventWithDocument;
  isFirst: boolean;
  isLast: boolean;
  projectId: string;
};

function TimelineEvent({ event, projectId }: TimelineEventProps) {
  return (
    <div className="relative pl-10">
      <div className="bg-entity-event ring-background absolute top-4 left-2 size-5 rounded-full ring-4">
        <Calendar className="text-background m-0.5 size-4" />
      </div>

      <Link
        to="/entities/$entityId"
        params={{ entityId: event._id }}
        search={{ project: projectId }}
        className="block"
      >
        <Card className="hover:border-primary/50 hover:ring-primary/20 transition-all duration-200 hover:shadow-md hover:ring-1">
          <CardHeader className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="font-serif text-base font-medium">{event.name}</CardTitle>
                  <Badge
                    variant="outline"
                    className={cn(
                      'bg-entity-event/15 text-entity-event ring-entity-event/20 h-5 px-1.5 py-0 text-xs font-normal capitalize'
                    )}
                  >
                    event
                  </Badge>
                </div>
                {event.description && (
                  <CardDescription className="line-clamp-2 text-sm">
                    {event.description}
                  </CardDescription>
                )}
              </div>

              {event.document && (
                <div className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs">
                  <FileText className="size-3.5" />
                  <span className="max-w-[120px] truncate">{event.document.title}</span>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>
      </Link>
    </div>
  );
}
