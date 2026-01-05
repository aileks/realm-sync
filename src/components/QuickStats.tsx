import {
  BookOpen,
  FileText,
  Sparkles,
  User,
  MapPin,
  Package,
  Lightbulb,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type EntityCounts = {
  character: number;
  location: number;
  item: number;
  concept: number;
  event: number;
};

type QuickStatsProps = {
  totalEntities: number;
  totalFacts: number;
  totalDocuments: number;
  processedDocuments: number;
  coverage: number;
  entityCounts: EntityCounts;
  className?: string;
};

const entityTypeConfig = [
  { key: 'character' as const, icon: User, label: 'Characters', color: 'text-entity-character' },
  { key: 'location' as const, icon: MapPin, label: 'Locations', color: 'text-entity-location' },
  { key: 'item' as const, icon: Package, label: 'Items', color: 'text-entity-item' },
  { key: 'concept' as const, icon: Lightbulb, label: 'Concepts', color: 'text-entity-concept' },
  { key: 'event' as const, icon: Calendar, label: 'Events', color: 'text-entity-event' },
];

export function QuickStats({
  totalEntities,
  totalFacts,
  totalDocuments,
  processedDocuments,
  coverage,
  entityCounts,
  className,
}: QuickStatsProps) {
  const hasContent = totalEntities > 0 || totalFacts > 0 || totalDocuments > 0;

  if (!hasContent) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <StatItem icon={BookOpen} label="Entities" value={totalEntities} />
        <StatItem icon={Sparkles} label="Facts" value={totalFacts} />
        <StatItem
          icon={FileText}
          label="Documents"
          value={`${processedDocuments}/${totalDocuments}`}
        />
        <CoverageBar coverage={coverage} />
      </div>

      {totalEntities > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {entityTypeConfig.map(({ key, icon: Icon, label, color }) => {
            const count = entityCounts[key];
            if (count === 0) return null;
            return (
              <div key={key} className="flex items-center gap-1.5">
                <Icon className={cn('size-3.5', color)} />
                <span className="text-muted-foreground text-xs">
                  {count} {count === 1 ? label.slice(0, -1) : label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type StatItemProps = {
  icon: typeof BookOpen;
  label: string;
  value: number | string;
};

function StatItem({ icon: Icon, label, value }: StatItemProps) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="text-muted-foreground size-4" />
      <span className="text-sm font-medium">{value}</span>
      <span className="text-muted-foreground text-sm">{label}</span>
    </div>
  );
}

type CoverageBarProps = {
  coverage: number;
};

function CoverageBar({ coverage }: CoverageBarProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted h-2 w-20 overflow-hidden rounded-full">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            coverage >= 100 ? 'bg-green-500'
            : coverage >= 50 ? 'bg-primary'
            : 'bg-amber-500'
          )}
          style={{ width: `${Math.min(coverage, 100)}%` }}
        />
      </div>
      <span className="text-muted-foreground text-xs">{coverage}% processed</span>
    </div>
  );
}
