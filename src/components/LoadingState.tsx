import {Loader2} from 'lucide-react';
import {cn} from '@/lib/utils';

type LoadingStateProps = {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

export function LoadingState({message, className, size = 'md'}: LoadingStateProps) {
  const iconSize = {
    sm: 'size-4',
    md: 'size-6',
    lg: 'size-8',
  }[size];

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12', className)}>
      <Loader2 className={cn('text-primary animate-spin', iconSize)} />
      {message && <p className="text-muted-foreground text-sm">{message}</p>}
    </div>
  );
}
