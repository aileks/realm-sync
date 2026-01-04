import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { useState } from 'react';
import {
  Calendar,
  FileText,
  AlertTriangle,
  User,
  MapPin,
  Package,
  Lightbulb,
  Users,
  Sparkles,
} from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/projects_/$projectId_/canon/timeline')({
  component: CanonTimeline,
});

type EntityType = 'character' | 'location' | 'item' | 'concept' | 'event';

const entityIcons: Record<EntityType, typeof User> = {
  character: User,
  location: MapPin,
  item: Package,
  concept: Lightbulb,
  event: Calendar,
};

const entityColors: Record<EntityType, string> = {
  character: 'bg-entity-character text-background',
  location: 'bg-entity-location text-background',
  item: 'bg-entity-item text-background',
  concept: 'bg-entity-concept text-background',
  event: 'bg-entity-event text-background',
};

const entityBadgeColors: Record<EntityType, string> = {
  character: 'bg-entity-character/15 text-entity-character ring-entity-character/20',
  location: 'bg-entity-location/15 text-entity-location ring-entity-location/20',
  item: 'bg-entity-item/15 text-entity-item ring-entity-item/20',
  concept: 'bg-entity-concept/15 text-entity-concept ring-entity-concept/20',
  event: 'bg-entity-event/15 text-entity-event ring-entity-event/20',
};

function CanonTimeline() {
  const { projectId } = Route.useParams();
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [showAppearances, setShowAppearances] = useState(true);

  const timeline = useQuery(api.entities.getTimeline, {
    projectId: projectId as Id<'projects'>,
    entityFilter: entityFilter !== 'all' ? (entityFilter as Id<'entities'>) : undefined,
    includeAppearances: showAppearances,
  });

  if (timeline === undefined) {
    return <LoadingState message="Loading timeline..." />;
  }

  const timelineItems = [
    ...timeline.events.map((e) => ({ ...e, itemType: 'event' as const })),
    ...timeline.appearances.map((a) => ({ ...a, itemType: 'appearance' as const })),
  ].toSorted((a, b) => {
    const orderA = a.document?.orderIndex ?? Infinity;
    const orderB = b.document?.orderIndex ?? Infinity;
    return orderA - orderB;
  });

  const hasEvents = timeline.events.length > 0;
  const hasAppearances = timeline.appearances.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Select value={entityFilter} onValueChange={(v) => setEntityFilter(v ?? 'all')}>
            <SelectTrigger className="w-[200px]">
              <Users className="text-muted-foreground mr-2 size-4" />
              <SelectValue>
                {entityFilter === 'all' ?
                  'All entities'
                : (timeline.entities.find((e) => e._id === entityFilter)?.name ??
                  'Filter by entity')
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              {timeline.entities.map((entity) => (
                <SelectItem key={entity._id} value={entity._id}>
                  {entity.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            onClick={() => setShowAppearances(!showAppearances)}
            className={cn(
              'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              showAppearances ?
                'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            <Sparkles className="size-4" />
            First appearances
          </button>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Timeline ordering is based on document order and may not reflect actual chronology within
          your story.
        </p>
      </div>

      {timelineItems.length === 0 ?
        <EmptyState
          title={entityFilter !== 'all' ? 'No timeline entries for this entity' : 'No events yet'}
          description={
            entityFilter !== 'all' ?
              'This entity has no events or first appearances in your canon yet.'
            : 'Events and entity first appearances will show here as you add documents and extract canon.'
          }
        />
      : <div className="relative">
          <div className="bg-border absolute top-0 bottom-0 left-4 w-px" />

          <div className="space-y-4">
            {timelineItems.map((item) =>
              item.itemType === 'event' ?
                <TimelineEventCard key={item._id} event={item} projectId={projectId} />
              : <TimelineAppearanceCard key={item._id} appearance={item} projectId={projectId} />
            )}
          </div>
        </div>
      }

      {(hasEvents || hasAppearances) && (
        <p className="text-muted-foreground text-center text-sm">
          Showing {timeline.events.length} event{timeline.events.length !== 1 ? 's' : ''}
          {showAppearances &&
            ` and ${timeline.appearances.length} first appearance${timeline.appearances.length !== 1 ? 's' : ''}`}
        </p>
      )}
    </div>
  );
}

type TimelineEventCardProps = {
  event: {
    _id: Id<'entities'>;
    name: string;
    type: EntityType;
    description?: string;
    document: { _id: Id<'documents'>; title: string; orderIndex: number } | null;
    involvedEntities: Array<{ _id: Id<'entities'>; name: string; type: string }>;
  };
  projectId: string;
};

function TimelineEventCard({ event, projectId }: TimelineEventCardProps) {
  const Icon = entityIcons.event;

  return (
    <div className="relative pl-10">
      <div
        className={cn(
          'ring-background absolute top-4 left-2 flex size-5 items-center justify-center rounded-full ring-4',
          entityColors.event
        )}
      >
        <Icon className="size-3" />
      </div>

      <Link
        to="/entities/$entityId"
        params={{ entityId: event._id }}
        search={{ project: projectId }}
        className="block"
      >
        <Card className="hover:border-primary/50 hover:ring-primary/20 transition-all duration-200 hover:shadow-md hover:ring-1">
          <CardHeader className="p-4">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="font-serif text-base font-medium">{event.name}</CardTitle>
                    <Badge
                      variant="outline"
                      className={cn(
                        'h-5 px-1.5 py-0 text-xs font-normal capitalize',
                        entityBadgeColors.event
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

              {event.involvedEntities.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-muted-foreground text-xs">Involves:</span>
                  {event.involvedEntities.slice(0, 4).map((entity) => {
                    const EntityIcon = entityIcons[entity.type as EntityType] ?? User;
                    return (
                      <Badge
                        key={entity._id}
                        variant="secondary"
                        className="h-5 gap-1 px-1.5 text-xs font-normal"
                      >
                        <EntityIcon className="size-3" />
                        {entity.name}
                      </Badge>
                    );
                  })}
                  {event.involvedEntities.length > 4 && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs font-normal">
                      +{event.involvedEntities.length - 4} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
        </Card>
      </Link>
    </div>
  );
}

type TimelineAppearanceCardProps = {
  appearance: {
    _id: Id<'entities'>;
    name: string;
    type: string;
    document: { _id: Id<'documents'>; title: string; orderIndex: number } | null;
  };
  projectId: string;
};

function TimelineAppearanceCard({ appearance, projectId }: TimelineAppearanceCardProps) {
  const entityType = appearance.type as EntityType;
  const Icon = entityIcons[entityType] ?? User;

  return (
    <div className="relative pl-10">
      <div
        className={cn(
          'ring-background absolute top-4 left-2 flex size-5 items-center justify-center rounded-full ring-4',
          entityColors[entityType] ?? 'bg-muted text-muted-foreground'
        )}
      >
        <Icon className="size-3" />
      </div>

      <Link
        to="/entities/$entityId"
        params={{ entityId: appearance._id }}
        search={{ project: projectId }}
        className="block"
      >
        <Card className="hover:border-primary/50 hover:ring-primary/20 border-dashed transition-all duration-200 hover:shadow-md hover:ring-1">
          <CardHeader className="p-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs font-medium">First appearance:</span>
                <span className="font-serif text-sm font-medium">{appearance.name}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    'h-5 px-1.5 py-0 text-xs font-normal capitalize',
                    entityBadgeColors[entityType] ?? 'bg-muted text-muted-foreground'
                  )}
                >
                  {appearance.type}
                </Badge>
              </div>

              {appearance.document && (
                <div className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs">
                  <FileText className="size-3.5" />
                  <span className="max-w-[100px] truncate">{appearance.document.title}</span>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>
      </Link>
    </div>
  );
}
