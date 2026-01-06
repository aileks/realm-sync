import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { MothIcon } from '@/components/ui/moth-icon';
import { AlertTriangle, MessageCircle } from 'lucide-react';

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

const TIPS = [
  'Add documents to your project, then extract entities and facts from them.',
  'Review extracted entities in the Canon Browser to confirm or reject them.',
  'Use the Timeline view to see events in chronological order.',
  'The Connections view shows relationships between your entities.',
  'Keyboard shortcut: Press Cmd+K to open the command palette, or Cmd+Shift+K for all shortcuts.',
];

type VellumButtonProps = {
  collapsed: boolean;
};

export function VellumButton({ collapsed }: VellumButtonProps) {
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const navigate = useNavigate();

  const handleChatClick = () => {
    void navigate({ to: '/vellum/chat' });
  };

  const handleAlertsClick = () => {
    setSheetOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            'w-full cursor-pointer',
            collapsed ? 'justify-center px-0' : 'justify-start'
          )}
        >
          <MothIcon className="size-4" />
          {!collapsed && <span className="ml-2">Vellum</span>}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" sideOffset={8}>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Archive Assistant</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleChatClick}>
              <MessageCircle className="mr-2 size-4" />
              Chat with Vellum
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAlertsClick}>
              <AlertTriangle className="mr-2 size-4" />
              Alerts & Tips
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger className="hidden" />
        <SheetContent side="left" className="w-80 sm:max-w-80">
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

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            <MessageBubble>{VELLUM_MESSAGES.welcome}</MessageBubble>
            <MessageBubble variant="tip">{tip}</MessageBubble>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

type MessageBubbleProps = {
  children: React.ReactNode;
  variant?: 'default' | 'tip';
};

function MessageBubble({ children, variant = 'default' }: MessageBubbleProps) {
  return (
    <div
      className={cn(
        'rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed',
        variant === 'default' && 'bg-muted',
        variant === 'tip' && 'border-primary/20 bg-primary/5 text-foreground/80 border'
      )}
    >
      {variant === 'tip' && (
        <span className="text-primary mb-1 block text-[10px] font-medium tracking-wider uppercase">
          Tip
        </span>
      )}
      {children}
    </div>
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
