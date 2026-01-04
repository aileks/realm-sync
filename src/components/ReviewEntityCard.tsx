import {useQuery} from 'convex/react';
import {api} from '../../convex/_generated/api';
import type {Doc, Id} from '../../convex/_generated/dataModel';
import {EntityCard} from './EntityCard';

type ReviewEntityCardProps = {
  projectId: Id<'projects'>;
  entity: Doc<'entities'>;
  onConfirm: (id: Id<'entities'>) => void;
  onReject: (id: Id<'entities'>) => void;
  onMerge: (sourceId: Id<'entities'>, targetId: Id<'entities'>) => void;
};

export function ReviewEntityCard({
  projectId,
  entity,
  onConfirm,
  onReject,
  onMerge,
}: ReviewEntityCardProps) {
  const similarEntities = useQuery(
    api.entities.findSimilar,
    entity.status === 'pending' ? {projectId, name: entity.name, excludeId: entity._id} : 'skip'
  );

  return (
    <EntityCard
      entity={entity}
      onConfirm={onConfirm}
      onReject={onReject}
      onMerge={onMerge}
      similarEntities={similarEntities ?? undefined}
    />
  );
}
