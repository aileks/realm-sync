import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageTransitionProps = {
  children: ReactNode;
  className?: string;
};

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <div
      className={cn(
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300',
        className
      )}
    >
      {children}
    </div>
  );
}
