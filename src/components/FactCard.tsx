import { Check, X, Quote, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardAction } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Doc, Id } from '../../convex/_generated/dataModel';

type Fact = Doc<'facts'>;

type FactCardProps = {
  fact: Fact;
  onConfirm: (id: Id<'facts'>) => void;
  onReject: (id: Id<'facts'>) => void;
  onHighlight?: (position: { start: number; end: number } | undefined) => void;
};

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9)
    return 'bg-green-500/15 text-green-600 dark:text-green-400 ring-green-500/20';
  if (confidence >= 0.7)
    return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/20';
  return 'bg-red-500/15 text-red-600 dark:text-red-400 ring-red-500/20';
}

export function FactCard({ fact, onConfirm, onReject, onHighlight }: FactCardProps) {
  const confidencePercent = Math.round(fact.confidence * 100);

  return (
    <Card
      className="group hover:border-primary/50 hover:ring-primary/20 transition-all duration-200 hover:shadow-md hover:ring-1"
      onMouseEnter={() => onHighlight?.(fact.evidencePosition ?? undefined)}
      onMouseLeave={() => onHighlight?.(undefined)}
    >
      <CardHeader className="p-4">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm leading-relaxed">
              <span className="text-foreground bg-secondary/50 rounded-md px-1.5 py-0.5 font-serif font-medium">
                {fact.subject}
              </span>
              <ArrowRight className="text-muted-foreground/70 size-3.5" />
              <span className="text-muted-foreground italic">{fact.predicate}</span>
              <ArrowRight className="text-muted-foreground/70 size-3.5" />
              <span className="text-foreground bg-secondary/50 rounded-md px-1.5 py-0.5 font-serif font-medium">
                {fact.object}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  'h-5 border-transparent px-1.5 text-[10px] font-normal ring-1',
                  getConfidenceColor(fact.confidence)
                )}
              >
                {confidencePercent}% confidence
              </Badge>
              {fact.temporalBound && (
                <Badge
                  variant="outline"
                  className="text-muted-foreground h-5 px-1.5 text-[10px] font-normal"
                >
                  {fact.temporalBound.type}: {fact.temporalBound.value}
                </Badge>
              )}
            </div>

            <div className="border-border/50 bg-muted/30 relative rounded-lg border p-3 pl-9">
              <Quote className="text-muted-foreground/50 absolute top-3 left-3 size-3.5" />
              <p className="text-muted-foreground line-clamp-3 font-mono text-xs leading-relaxed">
                "{fact.evidenceSnippet}"
              </p>
            </div>
          </div>

          <CardAction className="flex shrink-0 gap-1 opacity-80 transition-opacity group-hover:opacity-100">
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground size-8 p-0 hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400"
              onClick={() => onConfirm(fact._id)}
            >
              <Check className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive size-8 p-0"
              onClick={() => onReject(fact._id)}
            >
              <X className="size-4" />
            </Button>
          </CardAction>
        </div>
      </CardHeader>
    </Card>
  );
}
