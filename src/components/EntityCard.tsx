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

type EntityCardProps = {
  entity: Entity;
  onConfirm?: (id: Id<'entities'>) => void;
  onReject?: (id: Id<'entities'>) => void;
  onEdit?: (entity: Entity) => void;
  similarEntities?: Entity[];
  onMerge?: (sourceId: Id<'entities'>, targetId: Id<'entities'>) => void;
  className?: string;
};

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
  className,
}: EntityCardProps) {
  const config = entityTypeConfig[entity.type] ?? defaultConfig;
  const Icon = config.icon;

  return (
    <Card
      className={cn(
        'group hover:border-primary/50 hover:ring-primary/20 flex w-full flex-col transition-all duration-200 hover:shadow-md hover:ring-1',
        className
      )}
    >
      <CardHeader className="flex flex-col gap-4 p-4">
        <div className="flex w-full items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-4">
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
                  {entity.name}
                </CardTitle>
                <Badge
                  variant="outline"
                  className={cn(
                    'h-5 px-1.5 py-0 text-xs font-normal capitalize',
                    config.colorClass
                  )}
                >
                  {entity.type}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    'h-5 px-1.5 py-0 text-xs font-normal capitalize',
                    entity.status === 'confirmed' ?
                      'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  )}
                >
                  {entity.status}
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
                      className="h-5 px-1.5 text-xs font-normal"
                    >
                      {alias}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          {(onConfirm || onEdit || onReject) && (
            <CardAction className="flex shrink-0 gap-1">
              {onConfirm && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground size-8 p-0 hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400"
                  onClick={() => onConfirm(entity._id)}
                >
                  <Check className="size-4" />
                </Button>
              )}
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
              {onReject && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive size-8 p-0"
                  onClick={() => onReject(entity._id)}
                >
                  <X className="size-4" />
                </Button>
              )}
            </CardAction>
          )}
        </div>

        {similarEntities && similarEntities.length > 0 && onMerge && (
          <div className="w-full rounded-r-md border-y border-r border-l-4 border-amber-500/20 border-l-amber-500 bg-amber-500/10 p-3 dark:bg-amber-500/5">
            <div className="mb-2 flex items-center gap-2">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Potential duplicates
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {similarEntities.map((similar) => (
                <Button
                  key={similar._id}
                  size="sm"
                  variant="outline"
                  className="bg-background/50 h-8 border-amber-500/30 text-xs text-amber-800 hover:border-amber-500/50 hover:bg-amber-500/20 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200"
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
