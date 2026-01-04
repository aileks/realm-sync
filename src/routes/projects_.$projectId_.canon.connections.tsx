import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { useState } from 'react';
import { Users, AlertTriangle, User, MapPin, Package, Lightbulb, Calendar } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RelationshipGraph } from '@/components/RelationshipGraph';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';

const entityTypeColors = [
  { type: 'Character', color: 'bg-entity-character', icon: User },
  { type: 'Location', color: 'bg-entity-location', icon: MapPin },
  { type: 'Item', color: 'bg-entity-item', icon: Package },
  { type: 'Concept', color: 'bg-entity-concept', icon: Lightbulb },
  { type: 'Event', color: 'bg-entity-event', icon: Calendar },
];

export const Route = createFileRoute('/projects_/$projectId_/canon/connections')({
  component: CanonConnections,
});

function CanonConnections() {
  const navigate = useNavigate();
  const { projectId } = Route.useParams();
  const [entityFilter, setEntityFilter] = useState<string>('all');

  const graph = useQuery(api.entities.getRelationshipGraph, {
    projectId: projectId as Id<'projects'>,
    entityFilter: entityFilter !== 'all' ? (entityFilter as Id<'entities'>) : undefined,
  });

  const entities = useQuery(api.entities.listByProject, {
    projectId: projectId as Id<'projects'>,
    status: 'confirmed',
  });

  if (graph === undefined || entities === undefined) {
    return <LoadingState message="Loading relationship graph..." />;
  }

  const handleNodeClick = (nodeId: Id<'entities'>) => {
    void navigate({
      to: '/entities/$entityId',
      params: { entityId: nodeId },
      search: { project: projectId },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Select value={entityFilter} onValueChange={(v) => setEntityFilter(v ?? 'all')}>
          <SelectTrigger className="w-[200px]">
            <Users className="text-muted-foreground mr-2 size-4" />
            <SelectValue>
              {entityFilter === 'all' ?
                'All entities'
              : (entities.find((e) => e._id === entityFilter)?.name ?? 'Filter by entity')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value="all">All entities</SelectItem>
            {entities.map((entity) => (
              <SelectItem key={entity._id} value={entity._id}>
                {entity.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <AlertTriangle className="size-3.5 text-amber-500" />
          <span>Inferred from facts. Click to view. Drag to move. Scroll to zoom.</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {entityTypeColors.map(({ type, color, icon: Icon }) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={`size-3 rounded-full ${color}`} />
            <Icon className="text-muted-foreground size-3.5" />
            <span className="text-muted-foreground text-xs">{type}</span>
          </div>
        ))}
      </div>

      {graph.nodes.length === 0 ?
        <EmptyState
          title={
            entityFilter !== 'all' ? 'No relationships for this entity' : 'No relationships yet'
          }
          description={
            entityFilter !== 'all' ?
              'This entity has no inferred connections to other entities based on current facts.'
            : 'Relationships will appear here as facts are extracted that mention multiple entities.'
          }
        />
      : <div className="bg-card h-[600px] rounded-lg border">
          <RelationshipGraph
            nodes={graph.nodes}
            edges={graph.edges}
            onNodeClick={handleNodeClick}
            className="rounded-lg"
          />
        </div>
      }

      {graph.nodes.length > 0 && (
        <p className="text-muted-foreground text-center text-sm">
          Showing {graph.nodes.length} entit{graph.nodes.length !== 1 ? 'ies' : 'y'} with{' '}
          {graph.edges.length} connection{graph.edges.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
