import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useQuery, useMutation, usePaginatedQuery } from 'convex/react';
import { useState, useMemo } from 'react';
import { Users, Search, ArrowLeft, Filter, Plus } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import type { Id, Doc } from '../../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EntityCard } from '@/components/EntityCard';
import { EntityForm } from '@/components/EntityForm';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { PaginatedGrid } from '@/components/PaginatedGrid';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PAGE_SIZE = 24;

type EntityType = 'character' | 'location' | 'item' | 'concept' | 'event';
type EntityStatus = 'pending' | 'confirmed';

export const Route = createFileRoute('/projects/$projectId/entities')({
  component: EntitiesPage,
});

function EntitiesPage() {
  const navigate = useNavigate();
  const { projectId } = Route.useParams();
  const project = useQuery(api.projects.get, { id: projectId as Id<'projects'> });

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const confirmEntity = useMutation(api.entities.confirm);
  const rejectEntity = useMutation(api.entities.reject);
  const revealEntity = useMutation(api.entities.revealToPlayers);
  const hideEntity = useMutation(api.entities.hideFromPlayers);

  const isTtrpgProject = project?.projectType === 'ttrpg';

  const paginatedArgs = useMemo(
    () => ({
      projectId: projectId as Id<'projects'>,
      type: typeFilter !== 'all' ? (typeFilter as EntityType) : undefined,
      status: statusFilter !== 'all' ? (statusFilter as EntityStatus) : undefined,
    }),
    [projectId, typeFilter, statusFilter]
  );

  const { results, status, loadMore } = usePaginatedQuery(
    api.entities.listByProjectPaginated,
    paginatedArgs,
    { initialNumItems: PAGE_SIZE }
  );

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return results;
    const query = searchQuery.toLowerCase();
    return results.filter(
      (entity) =>
        entity.name.toLowerCase().includes(query) ||
        entity.aliases.some((a) => a.toLowerCase().includes(query))
    );
  }, [results, searchQuery]);

  if (project === undefined) {
    return <LoadingState message="Loading entities..." />;
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
          <h1 className="font-serif text-3xl font-bold">Entities</h1>
          <div className="flex items-center gap-4">
            {status !== 'LoadingFirstPage' && (
              <div className="text-muted-foreground text-sm">
                {filteredResults.length} loaded
                {status !== 'Exhausted' && '+'}
              </div>
            )}
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 size-4" />
              Add Entity
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
          <Input
            placeholder="Search entities..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || 'all')}>
          <SelectTrigger className="w-[180px]">
            <Filter className="text-muted-foreground mr-2 size-4" />
            <SelectValue>Filter by type</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="character">Character</SelectItem>
            <SelectItem value="location">Location</SelectItem>
            <SelectItem value="item">Item</SelectItem>
            <SelectItem value="concept">Concept</SelectItem>
            <SelectItem value="event">Event</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'all')}>
          <SelectTrigger className="w-[180px]">
            <Filter className="text-muted-foreground mr-2 size-4" />
            <SelectValue>Filter by status</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <PaginatedGrid
        results={filteredResults}
        status={status}
        loadMore={loadMore}
        pageSize={PAGE_SIZE}
        emptyState={
          results.length === 0 ?
            <EmptyState
              icon={<Users className="text-muted-foreground size-8" />}
              title="No entities yet"
              description="Entities will appear here once extracted from your documents."
            />
          : <EmptyState
              title="No matching entities"
              description="Try adjusting your search."
              action={
                <Button variant="outline" onClick={() => setSearchQuery('')}>
                  Clear Search
                </Button>
              }
            />
        }
        renderItem={(entity: Doc<'entities'>) => (
          <Link
            to="/entities/$entityId"
            params={{ entityId: entity._id }}
            search={{ project: projectId }}
            className="block"
          >
            <EntityCard
              entity={entity}
              isTtrpgProject={isTtrpgProject}
              onConfirm={
                entity.status === 'pending' ?
                  (id) => {
                    void confirmEntity({ id });
                  }
                : undefined
              }
              onReject={
                entity.status === 'pending' ?
                  (id) => {
                    void rejectEntity({ id });
                  }
                : undefined
              }
              onReveal={
                isTtrpgProject ?
                  (id) => {
                    void revealEntity({ entityId: id });
                  }
                : undefined
              }
              onHide={
                isTtrpgProject ?
                  (id) => {
                    void hideEntity({ entityId: id });
                  }
                : undefined
              }
            />
          </Link>
        )}
      />

      <AlertDialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Entity</AlertDialogTitle>
          </AlertDialogHeader>
          <EntityForm
            projectId={projectId as Id<'projects'>}
            onSuccess={() => setShowCreateModal(false)}
            onCancel={() => setShowCreateModal(false)}
          />
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
