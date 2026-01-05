import { useState, createContext, useContext, useCallback } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useHotkeys } from 'react-hotkeys-hook';
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

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const projectId = (params as { projectId?: string }).projectId as Id<'projects'> | undefined;

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const openCommandPalette = useCallback(() => {
    setCommandPaletteOpen(true);
  }, []);

  useHotkeys(
    'mod+k',
    (e) => {
      e.preventDefault();
      setCommandPaletteOpen(true);
    },
    { enableOnFormTags: false }
  );

  useHotkeys(
    'mod+/',
    (e) => {
      e.preventDefault();
      setCommandPaletteOpen(true);
    },
    { enableOnFormTags: false }
  );

  useHotkeys(
    'mod+n',
    (e) => {
      e.preventDefault();
      if (projectId) {
        void navigate({ to: '/projects/$projectId/documents/new', params: { projectId } });
      }
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
        '[data-search-input], input[placeholder*="Search"]'
      );
      searchInput?.focus();
    },
    { enableOnFormTags: false }
  );

  return (
    <KeyboardShortcutsContext value={{ openCommandPalette }}>
      {children}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
    </KeyboardShortcutsContext>
  );
}
