import { cn } from '@/lib/utils';

type BetaTagProps = {
  className?: string;
};

export function BetaTag({ className }: BetaTagProps) {
  return (
    <span className={cn('text-xs font-bold tracking-widest text-amber-600 uppercase', className)}>
      Beta
    </span>
  );
}
