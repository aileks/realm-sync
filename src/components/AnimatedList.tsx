import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AnimatedListProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T) => string;
  className?: string;
  itemClassName?: string;
};

export function AnimatedList<T>({
  items,
  renderItem,
  keyExtractor,
  className,
  itemClassName,
}: AnimatedListProps<T>) {
  return (
    <div className={className}>
      {items.map((item, index) => (
        <div
          key={keyExtractor(item)}
          className={cn(
            'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200',
            itemClassName
          )}
        >
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

type AnimatedGridProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T) => string;
  className?: string;
  itemClassName?: string;
};

export function AnimatedGrid<T>({
  items,
  renderItem,
  keyExtractor,
  className,
  itemClassName,
}: AnimatedGridProps<T>) {
  return (
    <div className={className}>
      {items.map((item, index) => (
        <div
          key={keyExtractor(item)}
          className={cn(
            'motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200',
            itemClassName
          )}
        >
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}
