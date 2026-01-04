import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

  const sortLabels: Record<SortBy, string> = {
    name: 'Name A-Z',
    recent: 'Recently Updated',
    factCount: 'Most Facts',
  };

  const entities = useQuery(api.entities.listByProjectWithStats, {
    projectId: projectId as Id<'projects'>,
    type: typeFilter === 'all' ? undefined : typeFilter,
    status: 'confirmed',
    sortBy,
  });

  const confirmEntity = useMutation(api.entities.confirm);
  const rejectEntity = useMutation(api.entities.reject);

  const typeCounts = useQuery(api.entities.listByProject, {
    projectId: projectId as Id<'projects'>,
    status: 'confirmed',
  });

  const counts =
    typeCounts ?
      {
        all: typeCounts.length,
        character: typeCounts.filter((e) => e.type === 'character').length,
        location: typeCounts.filter((e) => e.type === 'location').length,
        item: typeCounts.filter((e) => e.type === 'item').length,
        concept: typeCounts.filter((e) => e.type === 'concept').length,
        event: typeCounts.filter((e) => e.type === 'event').length,
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
              onConfirm={(id) => confirmEntity({ id })}
              onReject={(id) => rejectEntity({ id })}
            />
          ))}
        </div>
      }

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
  onConfirm: (id: Id<'entities'>) => void;
  onReject: (id: Id<'entities'>) => void;
};

function EntityCardWithStats({
  entity,
  factCount,
  viewMode,
  onConfirm,
  onReject,
}: EntityCardWithStatsProps) {
  const entityForCard = {
    ...entity,
    description:
      entity.description ?
        `${entity.description}${factCount > 0 ? ` • ${factCount} fact${factCount !== 1 ? 's' : ''}` : ''}`
      : factCount > 0 ? `${factCount} fact${factCount !== 1 ? 's' : ''}`
      : undefined,
  };

  return (
    <div className={cn(viewMode === 'list' && 'max-w-none')}>
      <EntityCard
        entity={entityForCard}
        onConfirm={onConfirm}
        onReject={onReject}
        className={viewMode === 'grid' ? 'h-full' : undefined}
      />
    </div>
  );
}
