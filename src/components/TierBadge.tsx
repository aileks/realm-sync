import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type TierBadgeProps = {
  tier: 'free' | 'unlimited';
  className?: string;
};

export function TierBadge({ tier, className }: TierBadgeProps) {
  if (tier === 'free') {
    return (
      <Badge variant="outline" className={cn('text-muted-foreground font-normal', className)}>
        Free
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'border-violet-400 font-bold font-semibold text-violet-400',
        className
      )}
    >
      Unlimited
    </Badge>
  );
}
