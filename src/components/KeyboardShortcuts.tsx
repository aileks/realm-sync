import { useState, createContext, useContext, useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
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
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandPaletteView, setCommandPaletteView] = useState<'commands' | 'shortcuts'>(
    'commands'
  );

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
    'shift+?',
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
