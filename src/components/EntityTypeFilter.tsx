import {User, MapPin, Package, Lightbulb, Calendar, Layers} from 'lucide-react';
import {cn} from '@/lib/utils';

type EntityType = 'character' | 'location' | 'item' | 'concept' | 'event';

type EntityTypeFilterProps = {
  value: EntityType | 'all';
  onChange: (value: EntityType | 'all') => void;
  counts?: Record<EntityType | 'all', number>;
};

const filterOptions: Array<{
  value: EntityType | 'all';
  label: string;
  icon: typeof Layers;
  colorClass: string;
}> = [
  {
    value: 'all',
    label: 'All',
    icon: Layers,
    colorClass: 'data-[active=true]:bg-primary/10 data-[active=true]:text-primary',
  },
  {
    value: 'character',
    label: 'Characters',
    icon: User,
    colorClass:
      'data-[active=true]:bg-entity-character/15 data-[active=true]:text-entity-character',
  },
  {
    value: 'location',
    label: 'Locations',
    icon: MapPin,
    colorClass: 'data-[active=true]:bg-entity-location/15 data-[active=true]:text-entity-location',
  },
  {
    value: 'item',
    label: 'Items',
    icon: Package,
    colorClass: 'data-[active=true]:bg-entity-item/15 data-[active=true]:text-entity-item',
  },
  {
    value: 'concept',
    label: 'Concepts',
    icon: Lightbulb,
    colorClass: 'data-[active=true]:bg-entity-concept/15 data-[active=true]:text-entity-concept',
  },
  {
    value: 'event',
    label: 'Events',
    icon: Calendar,
    colorClass: 'data-[active=true]:bg-entity-event/15 data-[active=true]:text-entity-event',
  },
];

export function EntityTypeFilter({value, onChange, counts}: EntityTypeFilterProps) {
  return (
    <div className="bg-muted/50 flex flex-wrap gap-1 rounded-lg p-1">
      {filterOptions.map((option) => {
        const Icon = option.icon;
        const isActive = value === option.value;
        const count = counts?.[option.value];

        return (
          <button
            key={option.value}
            type="button"
            data-active={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all',
              option.colorClass
            )}
          >
            <Icon className="size-4" />
            <span className="hidden sm:inline">{option.label}</span>
            {count !== undefined && (
              <span
                className={cn(
                  'bg-muted text-muted-foreground ml-1 rounded-full px-1.5 py-0.5 text-xs tabular-nums',
                  isActive && 'bg-background/50'
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
