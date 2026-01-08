import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KeyboardShortcutsProvider, useKeyboardShortcuts } from '@/components/KeyboardShortcuts';

const useQueryMock = vi.fn();

vi.mock('convex/react', () => ({
  useQuery: () => useQueryMock(),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
}));

vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: vi.fn(),
}));

vi.mock('@/components/CommandPalette', () => ({
  CommandPalette: ({ open }: { open: boolean }) => (
    <div data-testid="command-palette" data-open={open ? 'true' : 'false'} />
  ),
}));

function TriggerButton() {
  const { openCommandPalette } = useKeyboardShortcuts();
  return (
    <button type="button" onClick={openCommandPalette}>
      Open
    </button>
  );
}

describe('KeyboardShortcutsProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows opening command palette while auth is loading', () => {
    useQueryMock.mockReturnValueOnce(undefined);

    render(
      <KeyboardShortcutsProvider>
        <TriggerButton />
      </KeyboardShortcutsProvider>
    );

    fireEvent.click(screen.getByText('Open'));

    expect(screen.getByTestId('command-palette').getAttribute('data-open')).toBe('true');
  });

  it('blocks opening command palette when unauthenticated', () => {
    useQueryMock.mockReturnValueOnce(null);

    render(
      <KeyboardShortcutsProvider>
        <TriggerButton />
      </KeyboardShortcutsProvider>
    );

    fireEvent.click(screen.getByText('Open'));

    expect(screen.getByTestId('command-palette').getAttribute('data-open')).toBe('false');
  });
});
