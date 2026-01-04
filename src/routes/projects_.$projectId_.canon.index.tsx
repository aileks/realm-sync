import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { useState, useEffect } from 'react';
import { LayoutGrid, List, ArrowUpDown, Pencil, X, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/projects_/$projectId_/canon/')({
  component: CanonBrowserIndex,
});

type EntityType = 'character' | 'location' | 'item' | 'concept' | 'event';
type SortBy = 'name' | 'recent' | 'factCount';
type ViewMode = 'grid' | 'list';

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
      allEntities.filter((e: EntityWithStats) => e.type === typeFilter)
    : allEntities;

  const counts =
    allEntities ?
      {
        all: allEntities.length,
        character: allEntities.filter((e: EntityWithStats) => e.type === 'character').length,
        location: allEntities.filter((e: EntityWithStats) => e.type === 'location').length,
        item: allEntities.filter((e: EntityWithStats) => e.type === 'item').length,
        concept: allEntities.filter((e: EntityWithStats) => e.type === 'concept').length,
        event: allEntities.filter((e: EntityWithStats) => e.type === 'event').length,
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
      className={cn('w-full cursor-pointer text-left', viewMode === 'list' && 'max-w-none')}
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
  const updateEntity = useMutation(api.entities.update);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState<EntityType>('character');
  const [description, setDescription] = useState('');
  const [aliases, setAliases] = useState<string[]>([]);
  const [newAlias, setNewAlias] = useState('');

  useEffect(() => {
    if (entity) {
      setName(entity.name);
      setType(entity.type);
      setDescription(entity.description ?? '');
      setAliases(entity.aliases);
      setIsEditing(false);
      setNewAlias('');
    }
  }, [entity]);

  if (!entity) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsSaving(true);
    try {
      await updateEntity({
        id: entity._id,
        name: name.trim(),
        type,
        description: description.trim() || undefined,
        aliases,
      });
      toast.success('Entity updated');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update entity', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(entity.name);
    setType(entity.type);
    setDescription(entity.description ?? '');
    setAliases(entity.aliases);
    setNewAlias('');
    setIsEditing(false);
  };

  const handleAddAlias = () => {
    if (newAlias.trim() && !aliases.includes(newAlias.trim())) {
      setAliases([...aliases, newAlias.trim()]);
      setNewAlias('');
    }
  };

  const handleRemoveAlias = (aliasToRemove: string) => {
    setAliases(aliases.filter((a) => a !== aliasToRemove));
  };

  const typeColors: Record<EntityType, string> = {
    character: 'bg-entity-character/15 text-entity-character',
    location: 'bg-entity-location/15 text-entity-location',
    item: 'bg-entity-item/15 text-entity-item',
    concept: 'bg-entity-concept/15 text-entity-concept',
    event: 'bg-entity-event/15 text-entity-event',
  };

  return (
    <Sheet open={!!entity} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto p-6 sm:max-w-lg">
        <SheetHeader className="pr-12">
          <div className="flex items-center gap-3">
            <SheetTitle className="min-w-0 truncate font-serif text-2xl">{entity.name}</SheetTitle>
            <Badge className={cn('capitalize', typeColors[entity.type])}>{entity.type}</Badge>
          </div>
        </SheetHeader>

        <div className="mt-8 space-y-6">
          {isEditing ?
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="text-muted-foreground text-xs font-medium tracking-wider uppercase"
                  >
                    Name
                  </label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Entity name"
                    className="font-serif text-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                    Type
                  </label>
                  <Select value={type} onValueChange={(v) => setType(v as EntityType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="character">Character</SelectItem>
                      <SelectItem value="location">Location</SelectItem>
                      <SelectItem value="item">Item</SelectItem>
                      <SelectItem value="concept">Concept</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="description"
                  className="text-muted-foreground text-xs font-medium tracking-wider uppercase"
                >
                  Description
                </label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the entity..."
                  className="min-h-[100px] resize-none"
                />
              </div>

              <div>
                <h3 className="text-muted-foreground mb-2 text-sm font-medium">Also known as</h3>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {aliases.map((alias) => (
                      <Badge key={alias} variant="secondary" className="pr-1.5 pl-2.5">
                        {alias}
                        <button
                          type="button"
                          onClick={() => handleRemoveAlias(alias)}
                          className="text-muted-foreground hover:text-destructive ml-1 rounded-full p-0.5 transition-colors"
                        >
                          <X className="size-3" />
                          <span className="sr-only">Remove {alias}</span>
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newAlias}
                      onChange={(e) => setNewAlias(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddAlias();
                        }
                      }}
                      placeholder="Add alias..."
                      className="h-8 text-sm"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAddAlias}
                      disabled={!newAlias.trim()}
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="size-4" />
                      <span className="sr-only">Add alias</span>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 border-t pt-4">
                <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                  {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Save Changes
                </Button>
                <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                  Cancel
                </Button>
              </div>
            </div>
          : <>
              <Button variant="outline" className="w-full" onClick={() => setIsEditing(true)}>
                <Pencil className="mr-2 size-4" />
                Edit Entity
              </Button>

              {entity.description && (
                <SheetDescription className="text-foreground text-base">
                  {entity.description}
                </SheetDescription>
              )}

              <div>
                <h3 className="text-muted-foreground mb-2 text-sm font-medium">Also known as</h3>
                {entity.aliases.length > 0 ?
                  <div className="flex flex-wrap gap-2">
                    {entity.aliases.map((alias) => (
                      <Badge key={alias} variant="secondary">
                        {alias}
                      </Badge>
                    ))}
                  </div>
                : <p className="text-muted-foreground text-sm italic">No aliases recorded</p>}
              </div>

              <div>
                <h3 className="text-muted-foreground mb-2 text-sm font-medium">Facts</h3>
                <p className="text-foreground">
                  {entity.factCount} fact{entity.factCount !== 1 ? 's' : ''} recorded
                </p>
              </div>

              <p className="text-muted-foreground text-xs">
                Last edited {new Date(entity.updatedAt).toLocaleString()}
              </p>
            </>
          }
        </div>
      </SheetContent>
    </Sheet>
  );
}
