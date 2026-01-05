import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { VellumChat } from './VellumChat';

export type VellumMood = 'neutral' | 'alert' | 'success' | 'thinking';

export const VELLUM_MESSAGES = {
  welcome: "Welcome to your archive. I'm Vellum, and I'll help you keep track of your world.",
  firstDocument: 'Your first entry! Shall I begin cataloging?',
  extractionComplete: "I've catalogued {count} new entries from {document}.",
  alertFound: 'I noticed something that needs your attention in {document}.',
  noAlerts: 'All clear. Your canon is consistent.',
  emptyProject: 'This world awaits its first story. Add a document to begin.',
  emptyCanon: 'Your archive is empty. Extract canon from your documents to populate it.',
  searchNoResults: "I couldn't find anything matching '{query}'. Perhaps try different terms?",
  mergeSuccess: "I've combined these entries. Their knowledge is now unified.",
  deleteConfirm: 'This will remove {name} and all associated facts. Are you certain?',
} as const;

type VellumButtonProps = {
  collapsed: boolean;
};

export function VellumButton({ collapsed }: VellumButtonProps) {
  const button = (
    <SheetTrigger
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'sm' }),
        'w-full cursor-pointer',
        collapsed ? 'justify-center px-0' : 'justify-start'
      )}
    >
      <MothIcon className="size-4" />
      {!collapsed && <span className="ml-2">Vellum</span>}
    </SheetTrigger>
  );

  return (
    <Sheet>
      {collapsed ?
        <Tooltip>
          <TooltipTrigger render={button} />
          <TooltipContent side="right">Vellum</TooltipContent>
        </Tooltip>
      : button}
      <SheetContent side="left" className="flex w-80 flex-col sm:max-w-80">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/30 ring-1 ring-amber-500/30">
              <MothIcon className="size-6 text-amber-400" />
            </div>
            <div>
              <SheetTitle className="font-serif">Vellum</SheetTitle>
              <p className="text-muted-foreground text-xs">Your Archive Assistant</p>
            </div>
          </div>
        </SheetHeader>

        <VellumChat />
      </SheetContent>
    </Sheet>
  );
}

type MothIconProps = {
  className?: string;
};

function MothIcon({ className }: MothIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn('text-amber-400', className)}>
      <g className="origin-center">
        <path
          d="M12 4C10 4 8.5 6 8 8C7 9.5 4 10 3 12C4 14 7 14.5 8 16C8.5 18 10 20 12 20C14 20 15.5 18 16 16C17 14.5 20 14 21 12C20 10 17 9.5 16 8C15.5 6 14 4 12 4Z"
          fill="currentColor"
          fillOpacity="0.3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 6C11 6 10 7.5 9.5 9C9 10 7 10.5 6 12C7 13.5 9 14 9.5 15C10 16.5 11 18 12 18C13 18 14 16.5 14.5 15C15 14 17 13.5 18 12C17 10.5 15 10 14.5 9C14 7.5 13 6 12 6Z"
          fill="currentColor"
          fillOpacity="0.5"
        />
        <circle cx="10" cy="11" r="1" fill="currentColor" />
        <circle cx="14" cy="11" r="1" fill="currentColor" />
        <path d="M10 7C9 5 8 4 7 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <path
          d="M14 7C15 5 16 4 17 3"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <ellipse cx="12" cy="12" rx="2" ry="4" fill="currentColor" fillOpacity="0.7" />
      </g>
    </svg>
  );
}

type VellumEmptyStateProps = {
  type: 'project' | 'canon' | 'search' | 'documents';
  query?: string;
};

export function VellumEmptyState({ type, query }: VellumEmptyStateProps) {
  const messages: Record<typeof type, string> = {
    project: VELLUM_MESSAGES.emptyProject,
    canon: VELLUM_MESSAGES.emptyCanon,
    search:
      query ?
        VELLUM_MESSAGES.searchNoResults.replace('{query}', query)
      : "I couldn't find anything. Perhaps try different terms?",
    documents: 'No documents yet. Add your first document to begin building your archive.',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/10 to-amber-600/20">
        <MothIcon className="size-12" />
      </div>
      <p className="text-muted-foreground max-w-sm text-sm italic">{messages[type]}</p>
    </div>
  );
}
