import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { useState } from 'react';
import { Users, AlertTriangle } from 'lucide-react';
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
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
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Relationships are inferred from facts. Click a node to view entity details. Drag nodes to
          rearrange. Scroll to zoom.
        </p>
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
