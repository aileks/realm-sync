import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandPalette } from '@/components/CommandPalette';

beforeAll(() => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // oxlint-disable-next-line eslint/no-extend-native
  Element.prototype.scrollIntoView = vi.fn();
});

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
}));

vi.mock('convex/react', () => ({
  useQuery: () => undefined,
}));

vi.mock('../../convex/_generated/api', () => ({
  api: {
    projects: { list: 'projects.list' },
    documents: { list: 'documents.list' },
    entities: { listByProject: 'entities.listByProject' },
  },
}));

describe('CommandPalette', () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialView prop', () => {
    it('shows commands view by default when no initialView provided', () => {
      render(<CommandPalette open={true} onOpenChange={mockOnOpenChange} />);

      expect(screen.getByPlaceholderText('Type a command or search...')).toBeDefined();
      expect(screen.queryByText('← Back to commands')).toBeNull();
    });

    it('shows commands view when initialView is "commands"', () => {
      render(<CommandPalette open={true} onOpenChange={mockOnOpenChange} initialView="commands" />);

      expect(screen.getByPlaceholderText('Type a command or search...')).toBeDefined();
      expect(screen.queryByText('← Back to commands')).toBeNull();
    });

    it('shows shortcuts view when initialView is "shortcuts"', () => {
      render(
        <CommandPalette open={true} onOpenChange={mockOnOpenChange} initialView="shortcuts" />
      );

      expect(screen.getByText('← Back to commands')).toBeDefined();
      expect(screen.getByText('Open command palette')).toBeDefined();
      expect(screen.getByText('Show shortcuts')).toBeDefined();
    });

    it('allows navigating back from shortcuts to commands', () => {
      render(
        <CommandPalette open={true} onOpenChange={mockOnOpenChange} initialView="shortcuts" />
      );

      expect(screen.getByText('← Back to commands')).toBeDefined();

      fireEvent.click(screen.getByText('← Back to commands'));

      expect(screen.getByPlaceholderText('Type a command or search...')).toBeDefined();
      expect(screen.queryByText('← Back to commands')).toBeNull();
    });
  });

  describe('shortcuts cheatsheet content', () => {
    it('lists all documented global shortcuts', () => {
      render(
        <CommandPalette open={true} onOpenChange={mockOnOpenChange} initialView="shortcuts" />
      );

      expect(screen.getByText('Open command palette')).toBeDefined();
      expect(screen.getByText('Show shortcuts')).toBeDefined();
    });

    it('lists all documented navigation shortcuts', () => {
      render(
        <CommandPalette open={true} onOpenChange={mockOnOpenChange} initialView="shortcuts" />
      );

      expect(screen.getByText('Go to projects')).toBeDefined();
      expect(screen.getByText('Go to documents')).toBeDefined();
      expect(screen.getByText('Go to canon')).toBeDefined();
      expect(screen.getByText('Go to entities')).toBeDefined();
      expect(screen.getByText('Go to facts')).toBeDefined();
      expect(screen.getByText('Go to alerts')).toBeDefined();
      expect(screen.getByText('Go to review')).toBeDefined();
    });

    it('lists all documented editor shortcuts', () => {
      render(
        <CommandPalette open={true} onOpenChange={mockOnOpenChange} initialView="shortcuts" />
      );

      expect(screen.getByText('Save document')).toBeDefined();
      expect(screen.getByText('Trigger extraction')).toBeDefined();
      expect(screen.getByText('Close / Cancel')).toBeDefined();
    });
  });
});

describe('Search input selector', () => {
  const SELECTOR = 'input[type="search"], input[placeholder*="Search" i]';

  it('matches input with type="search"', () => {
    document.body.innerHTML = '<input type="search" />';
    const input = document.querySelector(SELECTOR);
    expect(input).not.toBeNull();
    expect(input?.getAttribute('type')).toBe('search');
  });

  it('matches input with placeholder containing "Search" (case-insensitive)', () => {
    document.body.innerHTML = '<input placeholder="Search entities..." />';
    const input = document.querySelector(SELECTOR);
    expect(input).not.toBeNull();
  });

  it('matches input with lowercase "search" in placeholder', () => {
    document.body.innerHTML = '<input placeholder="search items..." />';
    const input = document.querySelector(SELECTOR);
    expect(input).not.toBeNull();
  });

  it('matches type="search" input even among other inputs', () => {
    document.body.innerHTML = `
      <input type="text" placeholder="Name" />
      <input type="search" placeholder="Primary search" />
      <input type="text" placeholder="Email" />
    `;
    const input = document.querySelector(SELECTOR);
    expect(input).not.toBeNull();
    expect(input?.getAttribute('type')).toBe('search');
  });

  it('does not match unrelated inputs', () => {
    document.body.innerHTML = '<input type="text" placeholder="Enter name..." />';
    const input = document.querySelector(SELECTOR);
    expect(input).toBeNull();
  });
});
