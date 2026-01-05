import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

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

type VellumProps = {
  mood?: VellumMood;
  message?: string;
  onDismiss?: () => void;
  className?: string;
};

export function Vellum({ mood = 'neutral', message, onDismiss, className }: VellumProps) {
  const [isExpanded, setIsExpanded] = useState(!!message);

  return (
    <div className={cn('fixed bottom-6 left-20 z-40 flex flex-col items-start gap-2', className)}>
      {isExpanded && message && (
        <div className="bg-card ring-primary/20 animate-in slide-in-from-bottom-2 fade-in relative max-w-xs rounded-2xl p-4 shadow-xl ring-1 duration-200">
          {onDismiss && (
            <button
              onClick={() => {
                setIsExpanded(false);
                onDismiss();
              }}
              className="text-muted-foreground hover:text-foreground absolute top-2 right-2"
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </button>
          )}
          <p className="pr-6 text-sm leading-relaxed">{message}</p>
        </div>
      )}

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'group relative flex size-14 items-center justify-center rounded-full transition-all duration-300',
          'bg-gradient-to-br from-amber-500/20 to-amber-600/30',
          'hover:from-amber-500/30 hover:to-amber-600/40',
          'ring-1 ring-amber-500/30 hover:ring-amber-500/50',
          'shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20',
          mood === 'alert' && 'shadow-amber-400/30 ring-amber-400/60',
          mood === 'success' && 'animate-pulse',
          mood === 'thinking' && 'animate-shimmer'
        )}
        aria-label="Vellum the Archivist Moth"
      >
        <MothIcon mood={mood} />

        {mood === 'alert' && (
          <span className="absolute -top-0.5 -right-0.5 size-3 animate-pulse rounded-full bg-amber-400" />
        )}
      </button>
    </div>
  );
}

type MothIconProps = {
  mood: VellumMood;
  className?: string;
};

function MothIcon({ mood, className }: MothIconProps) {
  const wingSpread = mood === 'alert' ? 1.1 : 1;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn(
        'size-8 transition-transform duration-300',
        'text-amber-400 group-hover:text-amber-300',
        mood === 'thinking' && 'animate-pulse',
        className
      )}
      style={{ transform: `scale(${wingSpread})` }}
    >
      <g className="origin-center transition-transform duration-500 group-hover:scale-105">
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

        <path
          d="M10 7C9 5 8 4 7 3"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          className="origin-bottom-right transition-transform duration-300 group-hover:-rotate-12"
        />
        <path
          d="M14 7C15 5 16 4 17 3"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          className="origin-bottom-left transition-transform duration-300 group-hover:rotate-12"
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
        <MothIcon mood="neutral" className="size-12" />
      </div>
      <p className="text-muted-foreground max-w-sm text-sm italic">{messages[type]}</p>
    </div>
  );
}
