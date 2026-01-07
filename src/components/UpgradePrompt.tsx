import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckIcon, LockIcon } from 'lucide-react';
import { CheckoutLink } from '@convex-dev/polar/react';
import { api } from '../../convex/_generated/api';
import { useQuery } from 'convex/react';

type LimitType = 'projects' | 'documents' | 'entities' | 'extractions' | 'chat';

type UpgradePromptProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: LimitType;
  current: number;
  limit: number;
};

const LIMIT_LABELS: Record<LimitType, string> = {
  projects: 'Projects',
  documents: 'Documents',
  entities: 'Entities',
  extractions: 'Document Extractions',
  chat: 'Chat Messages',
};

export function UpgradePrompt({
  open,
  onOpenChange,
  limitType,
  current,
  limit,
}: UpgradePromptProps) {
  const products = useQuery(api.polar.getConfiguredProducts);
  const label = LIMIT_LABELS[limitType];
  const percentage = Math.min(100, Math.max(0, (current / limit) * 100));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-8 sm:max-w-[425px]">
        <DialogHeader className="gap-4">
          <div className="bg-primary/10 text-primary ring-primary/20 flex h-12 w-12 items-center justify-center rounded-full ring-1 ring-inset">
            <LockIcon className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <DialogTitle className="text-xl">{label} Limit Reached</DialogTitle>
            <DialogDescription className="text-base">
              You've used {current} of {limit} available {label.toLowerCase()} on your current plan.
              Upgrade to continue creating.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="bg-muted/50 ring-border space-y-2 rounded-xl p-4 ring-1">
          <div className="flex justify-between text-sm font-medium">
            <span className="text-muted-foreground">Current Usage</span>
            <span className={cn(current >= limit ? 'text-destructive' : 'text-foreground')}>
              {current} / {limit}
            </span>
          </div>
          <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
            <div
              className={cn(
                'bg-primary h-full transition-all duration-500 ease-out',
                current >= limit && 'bg-destructive'
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
            Unlock Realm Unlimited
          </h4>
          <ul className="space-y-2.5">
            {[
              `Unlimited ${label}`,
              'Advanced Document Extraction Models',
              'Early Access to New Features',
            ].map((benefit) => (
              <li key={benefit} className="flex items-start gap-2.5 text-sm">
                <CheckIcon className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          {products?.realmUnlimited && (
            <CheckoutLink
              polarApi={{
                generateCheckoutLink: api.polar.generateCheckoutLink,
              }}
              productIds={[products.realmUnlimited.id]}
              embed={false}
              className="shadow-primary/20 w-full gap-2 text-base font-semibold shadow-lg"
            >
              Upgrade - $5/month
            </CheckoutLink>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground w-full"
            onClick={() => onOpenChange(false)}
          >
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
