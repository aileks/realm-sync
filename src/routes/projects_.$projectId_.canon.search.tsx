import {createFileRoute, Link, useNavigate} from '@tanstack/react-router';
import {useQuery} from 'convex/react';
import {useState, useEffect, useRef} from 'react';
import {Search, User, MapPin, Package, Lightbulb, Calendar, HelpCircle, X} from 'lucide-react';
import {api} from '../../convex/_generated/api';
import type {Doc, Id} from '../../convex/_generated/dataModel';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Card, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import {EmptyState} from '@/components/EmptyState';
import {LoadingState} from '@/components/LoadingState';
import {cn} from '@/lib/utils';

export const Route = createFileRoute('/projects_/$projectId_/canon/search')({
  component: CanonSearch,
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === 'string' ? search.q : '',
  }),
});

type Entity = Doc<'entities'>;
type EntityType = Entity['type'];

const entityTypeConfig: Record<EntityType, {icon: typeof User; colorClass: string}> = {
  character: {
    icon: User,
    colorClass: 'bg-entity-character/15 text-entity-character ring-entity-character/20',
  },
  location: {
    icon: MapPin,
    colorClass: 'bg-entity-location/15 text-entity-location ring-entity-location/20',
  },
  item: {icon: Package, colorClass: 'bg-entity-item/15 text-entity-item ring-entity-item/20'},
  concept: {
    icon: Lightbulb,
    colorClass: 'bg-entity-concept/15 text-entity-concept ring-entity-concept/20',
  },
  event: {
    icon: Calendar,
    colorClass: 'bg-entity-event/15 text-entity-event ring-entity-event/20',
  },
};

const defaultConfig = {
  icon: HelpCircle,
  colorClass: 'bg-muted text-muted-foreground ring-muted',
};

function CanonSearch() {
  const navigate = useNavigate();
  const {projectId} = Route.useParams();
  const {q: initialQuery} = Route.useSearch();

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      if (query !== initialQuery) {
        void navigate({
          to: '/projects/$projectId/canon/search',
          params: {projectId},
          search: {q: query},
          replace: true,
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, initialQuery, navigate, projectId]);

  const results = useQuery(
    api.entities.search,
    debouncedQuery.trim() ?
      {
        projectId: projectId as Id<'projects'>,
        query: debouncedQuery.trim(),
      }
    : 'skip'
  );

  const isLoading = debouncedQuery.trim() && results === undefined;

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          ref={inputRef}
          type="search"
          placeholder="Search entities by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 pr-10 pl-10 text-base"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-1/2 right-2 size-7 -translate-y-1/2 p-0"
            onClick={() => setQuery('')}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      {!debouncedQuery.trim() ?
        <EmptyState
          title="Search your canon"
          description="Enter a name or keyword to search across all confirmed entities in your project."
        />
      : isLoading ?
        <LoadingState message="Searching..." />
      : results && results.length === 0 ?
        <EmptyState
          title="No matches found"
          description={`I couldn't find any entities matching "${debouncedQuery}". Try different terms or check your spelling.`}
        />
      : results && results.length > 0 ?
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Found {results.length} {results.length === 1 ? 'entity' : 'entities'}
          </p>
          <div className="grid gap-3">
            {results.map((entity) => (
              <SearchResultCard
                key={entity._id}
                entity={entity}
                query={debouncedQuery}
                projectId={projectId}
              />
            ))}
          </div>
        </div>
      : null}
    </div>
  );
}

type SearchResultCardProps = {
  entity: Entity;
  query: string;
  projectId: string;
};

function SearchResultCard({entity, query, projectId}: SearchResultCardProps) {
  const config = entityTypeConfig[entity.type] ?? defaultConfig;
  const Icon = config.icon;

  return (
    <Link
      to="/entities/$entityId"
      params={{entityId: entity._id}}
      search={{project: projectId}}
      className="block"
    >
      <Card className="hover:border-primary/50 hover:ring-primary/20 transition-all duration-200 hover:shadow-md hover:ring-1">
        <CardHeader className="flex flex-row items-start gap-4 p-4">
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-lg shadow-sm ring-1',
              config.colorClass
            )}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <CardTitle className="font-serif text-base leading-tight font-medium">
                <SearchHighlight text={entity.name} query={query} />
              </CardTitle>
              <Badge
                variant="outline"
                className={cn('h-5 px-1.5 py-0 text-xs font-normal capitalize', config.colorClass)}
              >
                {entity.type}
              </Badge>
            </div>
            {entity.description && (
              <CardDescription className="line-clamp-2 text-xs leading-relaxed">
                {entity.description}
              </CardDescription>
            )}
            {entity.aliases.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {entity.aliases.slice(0, 3).map((alias) => (
                  <Badge key={alias} variant="secondary" className="h-5 px-1.5 text-xs font-normal">
                    <SearchHighlight text={alias} query={query} />
                  </Badge>
                ))}
                {entity.aliases.length > 3 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs font-normal">
                    +{entity.aliases.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}

type SearchHighlightProps = {
  text: string;
  query: string;
};

function SearchHighlight({text, query}: SearchHighlightProps) {
  if (!query.trim()) return <>{text}</>;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ?
          <mark key={i} className="bg-primary/20 rounded-sm px-0.5 text-inherit">
            {part}
          </mark>
        : part
      )}
    </>
  );
}
