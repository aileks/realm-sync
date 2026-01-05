import { useState, createContext, useContext, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';
import type { Id } from '../../convex/_generated/dataModel';
import { CommandPalette } from './CommandPalette';

type KeyboardShortcutsContextValue = {
  openCommandPalette: () => void;
};

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);

export function useKeyboardShortcuts() {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within KeyboardShortcutsProvider');
  }
  return context;
}

type KeyboardShortcutsProviderProps = {
  children: React.ReactNode;
};

const CHORD_TIMEOUT = 800;

const NAV_CHORDS: Record<string, { route: string; requiresProject?: boolean; label: string }> = {
  p: { route: '/projects', label: 'Projects' },
  d: { route: '/projects/$projectId/documents', requiresProject: true, label: 'Documents' },
  c: { route: '/projects/$projectId/canon', requiresProject: true, label: 'Canon' },
  e: { route: '/projects/$projectId/entities', requiresProject: true, label: 'Entities' },
  f: { route: '/projects/$projectId/facts', requiresProject: true, label: 'Facts' },
  a: { route: '/projects/$projectId/alerts', requiresProject: true, label: 'Alerts' },
  r: { route: '/projects/$projectId/review', requiresProject: true, label: 'Review' },
};

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const projectId = (params as { projectId?: string }).projectId as Id<'projects'> | undefined;

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandPaletteView, setCommandPaletteView] = useState<'commands' | 'shortcuts'>(
    'commands'
  );
  const [awaitingChord, setAwaitingChord] = useState(false);
  const chordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openCommandPalette() {
    setCommandPaletteOpen(true);
  }

  const cancelChord = useCallback(() => {
    setAwaitingChord(false);
    if (chordTimeoutRef.current) {
      clearTimeout(chordTimeoutRef.current);
      chordTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    function handleChordKey(e: KeyboardEvent) {
      if (!awaitingChord) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const key = e.key.toLowerCase();

      if (key === 'escape') {
        e.preventDefault();
        cancelChord();
        return;
      }

      const chord = NAV_CHORDS[key];
      if (chord) {
        e.preventDefault();
        cancelChord();

        if (chord.requiresProject && !projectId) {
          toast.error('No project selected', { description: 'Navigate to a project first' });
          return;
        }

        if (chord.requiresProject && projectId) {
          void navigate({
            to: chord.route as '/projects/$projectId/documents',
            params: { projectId },
          });
        } else {
          void navigate({ to: chord.route as '/projects' });
        }
        toast.success(`Go to ${chord.label}`);
      } else {
        cancelChord();
      }
    }

    if (awaitingChord) {
      window.addEventListener('keydown', handleChordKey);
      return () => window.removeEventListener('keydown', handleChordKey);
    }
  }, [awaitingChord, cancelChord, navigate, projectId]);

  useHotkeys(
    'mod+k',
    (e) => {
      e.preventDefault();
      setCommandPaletteOpen(true);
    },
    { enableOnFormTags: false }
  );

  useHotkeys(
    'mod+shift+k',
    (e) => {
      e.preventDefault();
      setCommandPaletteView('shortcuts');
      setCommandPaletteOpen(true);
    },
    { enableOnFormTags: false }
  );

  useHotkeys(
    '/',
    (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      e.preventDefault();
      const searchInput = document.querySelector<HTMLInputElement>(
        'input[type="search"], input[placeholder*="Search" i]'
      );
      searchInput?.focus();
    },
    { enableOnFormTags: false }
  );

  useEffect(() => {
    function handleGKey(e: KeyboardEvent) {
      if (e.key !== 'g' || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (awaitingChord) return;

      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      e.preventDefault();
      setAwaitingChord(true);
      toast('Press a key to navigate...', { duration: CHORD_TIMEOUT, id: 'chord-hint' });

      chordTimeoutRef.current = setTimeout(() => {
        setAwaitingChord(false);
        toast.dismiss('chord-hint');
      }, CHORD_TIMEOUT);
    }

    window.addEventListener('keydown', handleGKey);
    return () => window.removeEventListener('keydown', handleGKey);
  }, [awaitingChord]);

  return (
    <KeyboardShortcutsContext value={{ openCommandPalette }}>
      {children}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={(open) => {
          setCommandPaletteOpen(open);
          if (!open) setCommandPaletteView('commands');
        }}
        initialView={commandPaletteView}
      />
    </KeyboardShortcutsContext>
  );
}
