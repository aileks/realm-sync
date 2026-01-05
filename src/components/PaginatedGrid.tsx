import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PaginatedGridProps<T> = {
  results: T[];
  status: 'LoadingFirstPage' | 'CanLoadMore' | 'LoadingMore' | 'Exhausted';
  loadMore: (numItems: number) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  pageSize?: number;
  className?: string;
  gridClassName?: string;
  emptyState?: React.ReactNode;
};

export function PaginatedGrid<T extends { _id: string }>({
  results,
  status,
  loadMore,
  renderItem,
  pageSize = 24,
  className,
  gridClassName,
  emptyState,
}: PaginatedGridProps<T>) {
  if (status === 'LoadingFirstPage') {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Loader2 className="text-primary size-6 animate-spin" />
      </div>
    );
  }

  if (results.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={className}>
      <div className={cn('grid auto-rows-fr gap-4 md:grid-cols-2 lg:grid-cols-3', gridClassName)}>
        {results.map((item, index) => (
          <div key={item._id} className="flex">
            {renderItem(item, index)}
          </div>
        ))}
      </div>

      {(status === 'CanLoadMore' || status === 'LoadingMore') && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={() => loadMore(pageSize)}
            disabled={status === 'LoadingMore'}
          >
            {status === 'LoadingMore' ?
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading...
              </>
            : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
}
