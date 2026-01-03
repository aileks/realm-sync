import {
  User,
  MapPin,
  Package,
  Lightbulb,
  Calendar,
  Check,
  X,
  Pencil,
  HelpCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Doc, Id } from '../../convex/_generated/dataModel';

type Entity = Doc<'entities'>;
type EntityType = Entity['type'];

interface EntityCardProps {
  entity: Entity;
  onConfirm: (id: Id<'entities'>) => void;
  onReject: (id: Id<'entities'>) => void;
  onEdit?: (entity: Entity) => void;
  similarEntities?: Entity[];
  onMerge?: (sourceId: Id<'entities'>, targetId: Id<'entities'>) => void;
}

const defaultConfig = {
  icon: HelpCircle,
  colorClass: 'bg-muted text-muted-foreground ring-muted',
};

const entityTypeConfig: Record<EntityType, { icon: typeof User; colorClass: string }> = {
  character: {
    icon: User,
    colorClass: 'bg-entity-character/15 text-entity-character ring-entity-character/20',
  },
  location: {
    icon: MapPin,
    colorClass: 'bg-entity-location/15 text-entity-location ring-entity-location/20',
  },
  item: { icon: Package, colorClass: 'bg-entity-item/15 text-entity-item ring-entity-item/20' },
  concept: {
    icon: Lightbulb,
    colorClass: 'bg-entity-concept/15 text-entity-concept ring-entity-concept/20',
  },
  event: {
    icon: Calendar,
    colorClass: 'bg-entity-event/15 text-entity-event ring-entity-event/20',
  },
};

export function EntityCard({
  entity,
  onConfirm,
  onReject,
  onEdit,
  similarEntities,
  onMerge,
}: EntityCardProps) {
  const config = entityTypeConfig[entity.type] ?? defaultConfig;
  const Icon = config.icon;

  return (
    <Card className="group hover:border-primary/50 hover:ring-primary/20 transition-all duration-200 hover:shadow-md hover:ring-1">
      <CardHeader className="p-4">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-lg shadow-sm ring-1',
              config.colorClass
            )}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="truncate font-serif text-base leading-none font-medium">
                {entity.name}
              </CardTitle>
              <Badge
                variant="outline"
                className={cn(
                  'h-5 px-1.5 py-0 text-[10px] font-normal capitalize',
                  config.colorClass
                )}
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
                {entity.aliases.map((alias) => (
                  <Badge
                    key={alias}
                    variant="secondary"
                    className="text-muted-foreground h-5 px-1.5 text-[10px] font-normal"
                  >
                    {alias}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <CardAction className="flex shrink-0 gap-1 opacity-80 transition-opacity group-hover:opacity-100">
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground size-8 p-0 hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400"
              onClick={() => onConfirm(entity._id)}
            >
              <Check className="size-4" />
            </Button>
            {onEdit && (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:bg-primary/10 hover:text-primary size-8 p-0"
                onClick={() => onEdit(entity)}
              >
                <Pencil className="size-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive size-8 p-0"
              onClick={() => onReject(entity._id)}
            >
              <X className="size-4" />
            </Button>
          </CardAction>
        </div>

        {similarEntities && similarEntities.length > 0 && onMerge && (
          <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="mb-2 flex items-center gap-2">
              <div className="size-1.5 rounded-full bg-amber-500" />
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Potential duplicates
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {similarEntities.map((similar) => (
                <Button
                  key={similar._id}
                  size="sm"
                  variant="outline"
                  className="bg-background/50 h-6 border-amber-500/20 text-[10px] hover:bg-amber-500/10 hover:text-amber-600"
                  onClick={() => onMerge(entity._id, similar._id)}
                >
                  Merge with "{similar.name}"
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardHeader>
    </Card>
  );
}
