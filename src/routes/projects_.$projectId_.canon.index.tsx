import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { useState } from 'react';
import { LayoutGrid, List, ArrowUpDown } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { EntityCard } from '@/components/EntityCard';
import { EntityTypeFilter } from '@/components/EntityTypeFilter';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/projects_/$projectId_/canon/')({
  component: CanonBrowserIndex,
});

type EntityType = 'character' | 'location' | 'item' | 'concept' | 'event';
type SortBy = 'name' | 'recent' | 'factCount';
type ViewMode = 'grid' | 'list';

function CanonBrowserIndex() {
  const navigate = useNavigate();
  const { projectId } = Route.useParams();

  const [typeFilter, setTypeFilter] = useState<EntityType | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedEntity, setSelectedEntity] = useState<EntityWithStats | null>(null);

  const sortLabels: Record<SortBy, string> = {
    name: 'Name A-Z',
    recent: 'Recently Updated',
    factCount: 'Most Facts',
  };

  const allEntities = useQuery(api.entities.listByProjectWithStats, {
    projectId: projectId as Id<'projects'>,
    status: 'confirmed',
    sortBy,
  });

  const entities =
    allEntities && typeFilter !== 'all' ?
      allEntities.filter((e) => e.type === typeFilter)
    : allEntities;

  const counts =
    allEntities ?
      {
        all: allEntities.length,
        character: allEntities.filter((e) => e.type === 'character').length,
        location: allEntities.filter((e) => e.type === 'location').length,
        item: allEntities.filter((e) => e.type === 'item').length,
        concept: allEntities.filter((e) => e.type === 'concept').length,
        event: allEntities.filter((e) => e.type === 'event').length,
      }
    : undefined;

  if (entities === undefined) {
    return <LoadingState message="Loading canon..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <EntityTypeFilter value={typeFilter} onChange={setTypeFilter} counts={counts} />

        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="w-[160px]">
              <ArrowUpDown className="text-muted-foreground mr-2 size-4" />
              <SelectValue>{sortLabels[sortBy]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name A-Z</SelectItem>
              <SelectItem value="recent">Recently Updated</SelectItem>
              <SelectItem value="factCount">Most Facts</SelectItem>
            </SelectContent>
          </Select>

          <div className="bg-muted flex rounded-md p-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn('size-8 p-0', viewMode === 'grid' && 'bg-background shadow-sm')}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn('size-8 p-0', viewMode === 'list' && 'bg-background shadow-sm')}
              onClick={() => setViewMode('list')}
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {entities.length === 0 ?
        <EmptyState
          title="Your archive awaits"
          description={
            typeFilter === 'all' ?
              'No confirmed entities yet. Process documents to extract canon, then confirm entities in the review queue.'
            : `No confirmed ${typeFilter}s found. Try a different filter or process more documents.`
          }
          action={
            <Button
              variant="outline"
              onClick={() =>
                navigate({ to: '/projects/$projectId/documents', params: { projectId } })
              }
            >
              View Documents
            </Button>
          }
        />
      : <div
          className={cn(
            'gap-4',
            viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col'
          )}
        >
          {entities.map((entity: EntityWithStats) => (
            <EntityCardWithStats
              key={entity._id}
              entity={entity}
              factCount={entity.factCount}
              viewMode={viewMode}
              onClick={() => setSelectedEntity(entity)}
            />
          ))}
        </div>
      }

      <EntityDetailSheet entity={selectedEntity} onClose={() => setSelectedEntity(null)} />

      {entities.length > 0 && (
        <p className="text-muted-foreground text-center text-sm">
          Showing {entities.length} {typeFilter === 'all' ? 'entities' : typeFilter + 's'}
        </p>
      )}
    </div>
  );
}

type EntityWithStats = {
  _id: Id<'entities'>;
  _creationTime: number;
  projectId: Id<'projects'>;
  name: string;
  type: EntityType;
  description?: string;
  aliases: string[];
  firstMentionedIn?: Id<'documents'>;
  status: 'pending' | 'confirmed';
  createdAt: number;
  updatedAt: number;
  factCount: number;
};

type EntityCardWithStatsProps = {
  entity: EntityWithStats;
  factCount: number;
  viewMode: ViewMode;
  onClick: () => void;
};

function EntityCardWithStats({ entity, factCount, viewMode, onClick }: EntityCardWithStatsProps) {
  const entityForCard = {
    ...entity,
    description:
      entity.description ?
        `${entity.description}${factCount > 0 ? ` • ${factCount} fact${factCount !== 1 ? 's' : ''}` : ''}`
      : factCount > 0 ? `${factCount} fact${factCount !== 1 ? 's' : ''}`
      : undefined,
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('w-full text-left', viewMode === 'list' && 'max-w-none')}
    >
      <EntityCard entity={entityForCard} className={viewMode === 'grid' ? 'h-full' : undefined} />
    </button>
  );
}

type EntityDetailSheetProps = {
  entity: EntityWithStats | null;
  onClose: () => void;
};

function EntityDetailSheet({ entity, onClose }: EntityDetailSheetProps) {
  if (!entity) return null;

  const typeColors: Record<EntityType, string> = {
    character: 'bg-entity-character/15 text-entity-character',
    location: 'bg-entity-location/15 text-entity-location',
    item: 'bg-entity-item/15 text-entity-item',
    concept: 'bg-entity-concept/15 text-entity-concept',
    event: 'bg-entity-event/15 text-entity-event',
  };

  return (
    <Sheet open={!!entity} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <SheetTitle className="font-serif text-2xl">{entity.name}</SheetTitle>
            <Badge className={cn('capitalize', typeColors[entity.type])}>{entity.type}</Badge>
          </div>
          {entity.description && (
            <SheetDescription className="text-base">{entity.description}</SheetDescription>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {entity.aliases.length > 0 && (
            <div>
              <h3 className="text-muted-foreground mb-2 text-sm font-medium">Also known as</h3>
              <div className="flex flex-wrap gap-2">
                {entity.aliases.map((alias) => (
                  <Badge key={alias} variant="secondary">
                    {alias}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-muted-foreground mb-2 text-sm font-medium">Facts</h3>
            <p className="text-foreground">
              {entity.factCount} fact{entity.factCount !== 1 ? 's' : ''} recorded
            </p>
          </div>

          <div className="text-muted-foreground border-t pt-4 text-xs">
            <p>Created: {new Date(entity.createdAt).toLocaleDateString()}</p>
            <p>Updated: {new Date(entity.updatedAt).toLocaleDateString()}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
