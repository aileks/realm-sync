import {createFileRoute, Link, useNavigate} from '@tanstack/react-router';
import {useQuery, useMutation} from 'convex/react';
import {useState} from 'react';
import {
  ArrowLeft,
  User,
  MapPin,
  Package,
  Lightbulb,
  Calendar,
  Pencil,
  FileText,
  ChevronDown,
  ChevronRight,
  Users,
  X,
  Plus,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import {toast} from 'sonner';
import {api} from '../../convex/_generated/api';
import type {Id, Doc} from '../../convex/_generated/dataModel';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Card, CardHeader, CardTitle, CardContent} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {LoadingState} from '@/components/LoadingState';
import {EmptyState} from '@/components/EmptyState';
import {cn} from '@/lib/utils';

export const Route = createFileRoute('/entities/$entityId')({
  component: EntityDetailPage,
  validateSearch: (search: Record<string, unknown>) => ({
    project: (search.project as string) || undefined,
  }),
});

type EntityType = 'character' | 'location' | 'item' | 'concept' | 'event';

const typeConfig: Record<EntityType, {icon: typeof User; colorClass: string; label: string}> = {
  character: {
    icon: User,
    label: 'Character',
    colorClass: 'bg-entity-character/15 text-entity-character ring-entity-character/20',
  },
  location: {
    icon: MapPin,
    label: 'Location',
    colorClass: 'bg-entity-location/15 text-entity-location ring-entity-location/20',
  },
  item: {
    icon: Package,
    label: 'Item',
    colorClass: 'bg-entity-item/15 text-entity-item ring-entity-item/20',
  },
  concept: {
    icon: Lightbulb,
    label: 'Concept',
    colorClass: 'bg-entity-concept/15 text-entity-concept ring-entity-concept/20',
  },
  event: {
    icon: Calendar,
    label: 'Event',
    colorClass: 'bg-entity-event/15 text-entity-event ring-entity-event/20',
  },
};

const defaultConfig = {
  icon: HelpCircle,
  label: 'Unknown',
  colorClass: 'bg-muted text-muted-foreground ring-muted',
};

function EntityDetailPage() {
  const navigate = useNavigate();
  const {entityId} = Route.useParams();
  const [isEditing, setIsEditing] = useState(false);

  const data = useQuery(api.entities.getWithDetails, {
    id: entityId as Id<'entities'>,
  });

  if (data === undefined) {
    return <LoadingState message="Loading entity..." />;
  }

  if (data === null) {
    return (
      <div className="container mx-auto p-6">
        <EmptyState
          title="Entity not found"
          description="This entity may have been deleted or you don't have access to it."
          action={
            <Button variant="outline" onClick={() => navigate({to: '/projects'})}>
              Back to Projects
            </Button>
          }
        />
      </div>
    );
  }

  const {entity, facts, appearances, relatedEntities} = data;
  const projectId = entity.projectId;
  const config = typeConfig[entity.type] ?? defaultConfig;

  return (
    <div className="container mx-auto space-y-8 p-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => navigate({to: '/projects/$projectId/canon', params: {projectId}})}
      >
        <ArrowLeft className="mr-1 size-4" />
        Back to Canon
      </Button>

      {isEditing ?
        <EntityEditForm
          entity={entity}
          onCancel={() => setIsEditing(false)}
          onSave={() => setIsEditing(false)}
        />
      : <>
          <EntityHeader entity={entity} config={config} onEdit={() => setIsEditing(true)} />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <AttributeList
                facts={facts}
                entityId={entity._id}
                projectId={projectId}
                entityName={entity.name}
              />
              <EvidencePanel facts={facts} />
            </div>

            <div className="space-y-6">
              <AppearanceTimeline appearances={appearances} projectId={projectId} />
              <RelatedEntitiesCard entities={relatedEntities} projectId={projectId} />
            </div>
          </div>
        </>
      }
    </div>
  );
}

type EntityHeaderProps = {
  entity: Doc<'entities'>;
  config: (typeof typeConfig)[EntityType];
  onEdit: () => void;
};

function EntityHeader({entity, config, onEdit}: EntityHeaderProps) {
  const Icon = config.icon;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'flex size-14 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1',
            config.colorClass
          )}
        >
          <Icon className="size-7" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl font-bold">{entity.name}</h1>
            <Badge className={cn('capitalize', config.colorClass)}>{config.label}</Badge>
          </div>
          {entity.description && (
            <p className="text-muted-foreground max-w-2xl">{entity.description}</p>
          )}
          {entity.aliases.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-muted-foreground text-sm">Also known as:</span>
              {entity.aliases.map((alias) => (
                <Badge key={alias} variant="secondary" className="text-xs">
                  {alias}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      <Button variant="outline" onClick={onEdit}>
        <Pencil className="mr-2 size-4" />
        Edit
      </Button>
    </div>
  );
}

type AttributeListProps = {
  facts: Doc<'facts'>[];
  entityId: Id<'entities'>;
  projectId: Id<'projects'>;
  entityName: string;
};

function AttributeList({facts, entityId, projectId, entityName}: AttributeListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const createFact = useMutation(api.facts.create);
  const [isAdding, setIsAdding] = useState(false);
  const [predicate, setPredicate] = useState('');
  const [object, setObject] = useState('');
  const [documentId, setDocumentId] = useState<Id<'documents'> | ''>('');

  const documents = useQuery(api.documents.list, {projectId});

  const confirmedFacts = facts.filter((f) => f.status === 'confirmed');
  const pendingFacts = facts.filter((f) => f.status === 'pending');

  const groupByPredicate = (factList: Doc<'facts'>[]) => {
    const grouped: Record<string, Doc<'facts'>[]> = {};
    for (const fact of factList) {
      const key = fact.predicate;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(fact);
    }
    return grouped;
  };

  const confirmedGrouped = groupByPredicate(confirmedFacts);
  const pendingGrouped = groupByPredicate(pendingFacts);

  const handleAddFact = async () => {
    if (!predicate.trim() || !object.trim() || !documentId) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsAdding(true);
    try {
      await createFact({
        projectId,
        entityId,
        documentId: documentId,
        subject: entityName,
        predicate: predicate
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_+|_+$/g, ''),
        object: object.trim(),
        confidence: 1.0,
        evidenceSnippet: 'Manually added',
        status: 'confirmed',
      });
      toast.success('Attribute added');
      setPredicate('');
      setObject('');
      setDocumentId('');
      setShowAddForm(false);
    } catch (error) {
      toast.error('Failed to add attribute', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Attributes</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="mr-1 size-4" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAddForm && (
          <div className="bg-muted/30 space-y-3 rounded-lg border p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="predicate" className="text-xs font-medium">
                  Attribute Name
                </label>
                <Input
                  id="predicate"
                  value={predicate}
                  onChange={(e) => setPredicate(e.target.value)}
                  placeholder="e.g. eye color, title, birthplace"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="object" className="text-xs font-medium">
                  Value
                </label>
                <Input
                  id="object"
                  value={object}
                  onChange={(e) => setObject(e.target.value)}
                  placeholder="e.g. blue, King, Winterfell"
                  className="h-9"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="document" className="text-xs font-medium">
                Source Document
              </label>
              <Select
                value={documentId || undefined}
                onValueChange={(v) => setDocumentId(v as Id<'documents'>)}
              >
                <SelectTrigger id="document" className="h-9">
                  <SelectValue>
                    {documentId ?
                      documents?.find((d) => d._id === documentId)?.title
                    : <span className="text-muted-foreground">Select a document...</span>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent
                  className="w-auto min-w-max"
                  align="start"
                  alignItemWithTrigger={false}
                >
                  {documents?.map((doc) => (
                    <SelectItem key={doc._id} value={doc._id}>
                      {doc.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(!documents || documents.length === 0) && (
                <p className="text-muted-foreground text-xs">
                  No documents available. Add a document first.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddFact} disabled={isAdding || !documentId}>
                {isAdding && <Loader2 className="mr-1 size-3 animate-spin" />}
                Add Attribute
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {facts.length === 0 && !showAddForm ?
          <p className="text-muted-foreground py-4 text-center text-sm italic">
            No facts recorded yet. Process documents to extract canon or add manually.
          </p>
        : <>
            {Object.entries(confirmedGrouped).map(([pred, predicateFacts]) => (
              <div key={pred} className="space-y-1">
                <h4 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  {pred.replace(/_/g, ' ')}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {predicateFacts.map((fact) => (
                    <Badge
                      key={fact._id}
                      variant="secondary"
                      className="bg-primary/10 text-foreground"
                    >
                      {fact.object}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}

            {Object.keys(pendingGrouped).length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-muted-foreground mb-2 text-xs font-medium">Pending Review</h4>
                {Object.entries(pendingGrouped).map(([pred, predicateFacts]) => (
                  <div key={pred} className="mb-2 space-y-1">
                    <span className="text-muted-foreground text-xs">
                      {pred.replace(/_/g, ' ')}:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {predicateFacts.map((fact) => (
                        <Badge
                          key={fact._id}
                          variant="outline"
                          className="border-dashed opacity-70"
                        >
                          {fact.object}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        }
      </CardContent>
    </Card>
  );
}

type EvidencePanelProps = {
  facts: Doc<'facts'>[];
};

function EvidencePanel({facts}: EvidencePanelProps) {
  const [expandedFactId, setExpandedFactId] = useState<Id<'facts'> | null>(null);

  const factsWithEvidence = facts.filter((f) => f.evidenceSnippet);

  if (factsWithEvidence.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Evidence</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {factsWithEvidence.map((fact) => {
          const isExpanded = expandedFactId === fact._id;
          return (
            <div key={fact._id} className="rounded-md border">
              <button
                type="button"
                className="hover:bg-muted/50 flex w-full items-center justify-between p-3 text-left transition-colors"
                onClick={() => setExpandedFactId(isExpanded ? null : fact._id)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm capitalize">
                    {fact.predicate.replace(/_/g, ' ')}:
                  </span>
                  <span className="text-sm font-medium">{fact.object}</span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(fact.confidence * 100)}%
                  </Badge>
                </div>
                {isExpanded ?
                  <ChevronDown className="text-muted-foreground size-4" />
                : <ChevronRight className="text-muted-foreground size-4" />}
              </button>
              {isExpanded && (
                <div className="bg-muted/30 border-t p-3">
                  <blockquote className="border-primary/50 border-l-2 pl-3 text-sm italic">
                    "{fact.evidenceSnippet}"
                  </blockquote>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

type AppearanceTimelineProps = {
  appearances: {_id: Id<'documents'>; title: string; orderIndex: number}[];
  projectId: Id<'projects'>;
};

function AppearanceTimeline({appearances, projectId}: AppearanceTimelineProps) {
  if (appearances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="size-5" />
            Appearances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm italic">No document appearances yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="size-5" />
          Appearances ({appearances.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-3">
          <div className="bg-border absolute top-0 bottom-0 left-2 w-px" />
          {appearances.map((doc, index) => (
            <div key={doc._id} className="relative flex items-center gap-3 pl-6">
              <div className="bg-primary border-background absolute left-0 size-4 rounded-full border-2" />
              <Link
                to="/projects/$projectId/documents/$documentId"
                params={{projectId, documentId: doc._id}}
                className="hover:text-primary text-sm transition-colors"
              >
                {doc.title}
              </Link>
              {index === 0 && (
                <Badge variant="secondary" className="text-xs">
                  First mention
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

type RelatedEntitiesCardProps = {
  entities: Doc<'entities'>[];
  projectId: Id<'projects'>;
};

function RelatedEntitiesCard({entities, projectId}: RelatedEntitiesCardProps) {
  if (entities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="size-5" />
            Related Entities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm italic">
            No relationships found yet. Relationships emerge as your canon grows.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="size-5" />
          Related Entities ({entities.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entities.map((entity) => {
          const config = typeConfig[entity.type] ?? defaultConfig;
          const Icon = config.icon;
          return (
            <Link
              key={entity._id}
              to="/entities/$entityId"
              params={{entityId: entity._id}}
              search={{project: projectId}}
              className="hover:bg-muted/50 flex items-center gap-3 rounded-md p-2 transition-colors"
            >
              <div
                className={cn(
                  'flex size-8 items-center justify-center rounded-lg ring-1',
                  config.colorClass
                )}
              >
                <Icon className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{entity.name}</p>
                <p className="text-muted-foreground text-xs capitalize">{entity.type}</p>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

type EntityEditFormProps = {
  entity: Doc<'entities'>;
  onCancel: () => void;
  onSave: () => void;
};

function EntityEditForm({entity, onCancel, onSave}: EntityEditFormProps) {
  const updateEntity = useMutation(api.entities.update);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState(entity.name);
  const [type, setType] = useState<EntityType>(entity.type);
  const [description, setDescription] = useState(entity.description ?? '');
  const [aliases, setAliases] = useState<string[]>(entity.aliases);
  const [newAlias, setNewAlias] = useState('');

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
      onSave();
    } catch (error) {
      toast.error('Failed to update entity', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSaving(false);
    }
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

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Edit Entity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Entity name"
              className="font-serif text-lg"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="type" className="text-sm font-medium">
              Type
            </label>
            <Select value={type} onValueChange={(v) => setType(v as EntityType)}>
              <SelectTrigger id="type">
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
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description..."
            className="min-h-[100px] resize-none"
          />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">Aliases</span>
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
              className="h-9"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddAlias}
              disabled={!newAlias.trim()}
              className="h-9 w-9 p-0"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-3 border-t pt-4">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save Changes
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
