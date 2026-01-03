import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { useState } from 'react';
import { Users, Search, ArrowLeft, Filter } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EntityCard } from '@/components/EntityCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const Route = createFileRoute('/projects_/$projectId_/entities')({
  component: EntitiesPage,
});

function EntitiesPage() {
  const navigate = useNavigate();
  const { projectId } = Route.useParams();
  const project = useQuery(api.projects.get, { id: projectId as Id<'projects'> });
  const entities = useQuery(api.entities.listByProject, { projectId: projectId as Id<'projects'> });

  const confirmEntity = useMutation(api.entities.confirm);
  const rejectEntity = useMutation(api.entities.reject);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  if (project === undefined || entities === undefined) {
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

  const filteredEntities = entities.filter((entity) => {
    const matchesSearch =
      entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.aliases.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === 'all' || entity.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || entity.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

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
          <div className="text-muted-foreground text-sm">
            {entities.length} total • {filteredEntities.length} visible
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

      {entities.length === 0 ?
        <EmptyState
          icon={<Users className="text-muted-foreground size-8" />}
          title="No entities yet"
          description="Entities will appear here once extracted from your documents."
        />
      : filteredEntities.length === 0 ?
        <EmptyState
          title="No matching entities"
          description="Try adjusting your search or filters."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
                setStatusFilter('all');
              }}
            >
              Clear Filters
            </Button>
          }
        />
      : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEntities.map((entity) => (
            <EntityCard
              key={entity._id}
              entity={entity}
              onConfirm={(id) => confirmEntity({ id })}
              onReject={(id) => rejectEntity({ id })}
            />
          ))}
        </div>
      }
    </div>
  );
}
