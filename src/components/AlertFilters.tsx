import {
  AlertTriangle,
  Clock,
  HelpCircle,
  AlertCircle,
  CheckCircle,
  XCircle,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type AlertType = 'contradiction' | 'timeline' | 'ambiguity';
type AlertSeverity = 'error' | 'warning';
type AlertStatus = 'open' | 'resolved' | 'dismissed';

type AlertFiltersProps = {
  statusFilter: AlertStatus | 'all';
  typeFilter: AlertType | 'all';
  severityFilter: AlertSeverity | 'all';
  onStatusChange: (value: AlertStatus | 'all') => void;
  onTypeChange: (value: AlertType | 'all') => void;
  onSeverityChange: (value: AlertSeverity | 'all') => void;
  counts?: {
    status: Record<AlertStatus | 'all', number>;
    type: Record<AlertType | 'all', number>;
    severity: Record<AlertSeverity | 'all', number>;
  };
};

const statusOptions: Array<{
  value: AlertStatus | 'all';
  label: string;
  icon: typeof Layers;
}> = [
  { value: 'all', label: 'All', icon: Layers },
  { value: 'open', label: 'Open', icon: AlertCircle },
  { value: 'resolved', label: 'Resolved', icon: CheckCircle },
  { value: 'dismissed', label: 'Dismissed', icon: XCircle },
];

const typeOptions: Array<{
  value: AlertType | 'all';
  label: string;
  icon: typeof Layers;
}> = [
  { value: 'all', label: 'All Types', icon: Layers },
  { value: 'contradiction', label: 'Contradiction', icon: AlertTriangle },
  { value: 'timeline', label: 'Timeline', icon: Clock },
  { value: 'ambiguity', label: 'Ambiguity', icon: HelpCircle },
];

const severityOptions: Array<{
  value: AlertSeverity | 'all';
  label: string;
}> = [
  { value: 'all', label: 'All Severity' },
  { value: 'error', label: 'Errors' },
  { value: 'warning', label: 'Warnings' },
];

export function AlertFilters({
  statusFilter,
  typeFilter,
  severityFilter,
  onStatusChange,
  onTypeChange,
  onSeverityChange,
  counts,
}: AlertFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="bg-muted/50 flex flex-wrap gap-1 rounded-lg p-1">
        {statusOptions.map((option) => {
          const Icon = option.icon;
          const isActive = statusFilter === option.value;
          const count = counts?.status[option.value];

          return (
            <button
              key={option.value}
              type="button"
              data-active={isActive}
              onClick={() => onStatusChange(option.value)}
              className={cn(
                'text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all',
                'data-[active=true]:bg-primary/10 data-[active=true]:text-primary'
              )}
            >
              <Icon className="size-3.5" />
              <span>{option.label}</span>
              {count !== undefined && count > 0 && (
                <span
                  className={cn(
                    'bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
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

      <div className="bg-muted/50 flex flex-wrap gap-1 rounded-lg p-1">
        {typeOptions.map((option) => {
          const Icon = option.icon;
          const isActive = typeFilter === option.value;

          return (
            <button
              key={option.value}
              type="button"
              data-active={isActive}
              onClick={() => onTypeChange(option.value)}
              className={cn(
                'text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all',
                'data-[active=true]:bg-primary/10 data-[active=true]:text-primary'
              )}
            >
              <Icon className="size-3.5" />
              <span className="hidden sm:inline">{option.label}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-muted/50 flex flex-wrap gap-1 rounded-lg p-1">
        {severityOptions.map((option) => {
          const isActive = severityFilter === option.value;

          return (
            <button
              key={option.value}
              type="button"
              data-active={isActive}
              onClick={() => onSeverityChange(option.value)}
              className={cn(
                'text-muted-foreground hover:text-foreground rounded-md px-2.5 py-1.5 text-xs font-medium transition-all',
                'data-[active=true]:bg-primary/10 data-[active=true]:text-primary',
                option.value === 'error' &&
                  'data-[active=true]:bg-red-500/10 data-[active=true]:text-red-600',
                option.value === 'warning' &&
                  'data-[active=true]:bg-amber-500/10 data-[active=true]:text-amber-600'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
