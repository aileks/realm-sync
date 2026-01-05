import { useEffect, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Command } from 'cmdk';
import {
  FileText,
  Search,
  Plus,
  BookOpen,
  AlertTriangle,
  Users,
  Lightbulb,
  Keyboard,
  FolderOpen,
} from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialView?: 'commands' | 'shortcuts';
};

export function CommandPalette({ open, onOpenChange, initialView }: CommandPaletteProps) {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const projectId = (params as { projectId?: string }).projectId as Id<'projects'> | undefined;

  const [search, setSearch] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);

  const projects = useQuery(api.projects.list, {});
  const documents = useQuery(api.documents.list, projectId ? { projectId } : 'skip');
  const entities = useQuery(api.entities.listByProject, projectId ? { projectId } : 'skip');

  function runAction(action: () => void) {
    onOpenChange(false);
    setSearch('');
    action();
  }

  useEffect(() => {
    if (open) {
      setShowShortcuts(initialView === 'shortcuts');
    } else {
      setSearch('');
      setShowShortcuts(false);
    }
  }, [open, initialView]);

  if (showShortcuts) {
    return (
      <Command.Dialog
        open={open}
        onOpenChange={onOpenChange}
        label="Keyboard shortcuts"
        aria-describedby={undefined}
        className="bg-popover fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl shadow-2xl"
      >
        <h1 className="sr-only">Keyboard Shortcuts</h1>
        <div className="border-border border-b px-4 py-3">
          <h2 className="font-serif text-lg font-semibold" aria-hidden>
            Keyboard Shortcuts
          </h2>
        </div>
        <div className="max-h-96 overflow-y-auto p-4">
          <ShortcutSection title="Global">
            <ShortcutItem keys={['⌘', 'K']} description="Open command palette" />
            <ShortcutItem keys={['⌘', '⇧', 'K']} description="Show shortcuts" />
            <ShortcutItem keys={['/']} description="Focus search" />
          </ShortcutSection>
          <ShortcutSection title="Navigation (g + key)">
            <ShortcutItem keys={['g', 'p']} description="Go to projects" />
            <ShortcutItem keys={['g', 'd']} description="Go to documents" />
            <ShortcutItem keys={['g', 'c']} description="Go to canon" />
            <ShortcutItem keys={['g', 'e']} description="Go to entities" />
            <ShortcutItem keys={['g', 'f']} description="Go to facts" />
            <ShortcutItem keys={['g', 'a']} description="Go to alerts" />
            <ShortcutItem keys={['g', 'r']} description="Go to review" />
          </ShortcutSection>
          <ShortcutSection title="Editor">
            <ShortcutItem keys={['⌘', 'E']} description="Trigger extraction" />
            <ShortcutItem keys={['Esc']} description="Close / Cancel" />
          </ShortcutSection>
        </div>
        <div className="border-border border-t px-4 py-3">
          <button
            className="text-muted-foreground hover:text-foreground text-sm"
            onClick={() => setShowShortcuts(false)}
          >
            ← Back to commands
          </button>
        </div>
      </Command.Dialog>
    );
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command palette"
      aria-describedby={undefined}
      className="bg-popover fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl shadow-2xl"
    >
      <h1 className="sr-only">Command palette</h1>
      <div className="border-border flex items-center gap-2 border-b px-4">
        <Search className="text-muted-foreground size-4" />
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="Type a command or search..."
          className="placeholder:text-muted-foreground h-12 w-full bg-transparent text-sm outline-none"
        />
      </div>

      <Command.List className="max-h-80 overflow-y-auto p-2">
        <Command.Empty className="text-muted-foreground py-6 text-center text-sm">
          No results found.
        </Command.Empty>

        {projectId && (
          <Command.Group heading="Quick Actions" className="mb-2">
            <CommandItem
              icon={Plus}
              onSelect={() =>
                runAction(() =>
                  navigate({ to: '/projects/$projectId/documents/new', params: { projectId } })
                )
              }
            >
              New Document
            </CommandItem>
            <CommandItem
              icon={BookOpen}
              onSelect={() =>
                runAction(() =>
                  navigate({ to: '/projects/$projectId/canon', params: { projectId } })
                )
              }
            >
              Browse Canon
            </CommandItem>
            <CommandItem
              icon={AlertTriangle}
              onSelect={() =>
                runAction(() =>
                  navigate({ to: '/projects/$projectId/alerts', params: { projectId } })
                )
              }
            >
              View Alerts
            </CommandItem>
          </Command.Group>
        )}

        <Command.Group heading="Navigation" className="mb-2">
          <CommandItem
            icon={FolderOpen}
            onSelect={() => runAction(() => navigate({ to: '/projects' }))}
          >
            All Projects
          </CommandItem>
          {projects?.slice(0, 5).map((project) => (
            <CommandItem
              key={project._id}
              icon={FolderOpen}
              onSelect={() =>
                runAction(() =>
                  navigate({ to: '/projects/$projectId', params: { projectId: project._id } })
                )
              }
            >
              {project.name}
            </CommandItem>
          ))}
        </Command.Group>

        {projectId && documents && documents.length > 0 && (
          <Command.Group heading="Documents" className="mb-2">
            {documents.slice(0, 5).map((doc) => (
              <CommandItem
                key={doc._id}
                icon={FileText}
                onSelect={() =>
                  runAction(() =>
                    navigate({
                      to: '/projects/$projectId/documents/$documentId',
                      params: { projectId, documentId: doc._id },
                    })
                  )
                }
              >
                {doc.title}
              </CommandItem>
            ))}
          </Command.Group>
        )}

        {projectId && entities && entities.length > 0 && (
          <Command.Group heading="Entities" className="mb-2">
            {entities.slice(0, 5).map((entity) => (
              <CommandItem
                key={entity._id}
                icon={entity.type === 'character' ? Users : Lightbulb}
                onSelect={() =>
                  runAction(() =>
                    navigate({
                      to: '/entities/$entityId',
                      params: { entityId: entity._id },
                      search: { project: projectId },
                    })
                  )
                }
              >
                {entity.name}
              </CommandItem>
            ))}
          </Command.Group>
        )}

        <Command.Group heading="Help">
          <CommandItem icon={Keyboard} onSelect={() => setShowShortcuts(true)}>
            Keyboard Shortcuts
          </CommandItem>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}

type CommandItemProps = {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onSelect: () => void;
};

function CommandItem({ icon: Icon, children, onSelect }: CommandItemProps) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="aria-selected:bg-accent aria-selected:text-accent-foreground group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm outline-none"
    >
      <Icon className="text-muted-foreground group-aria-selected:text-accent-foreground size-4" />
      <span>{children}</span>
    </Command.Item>
  );
}

type ShortcutSectionProps = {
  title: string;
  children: React.ReactNode;
};

function ShortcutSection({ title, children }: ShortcutSectionProps) {
  return (
    <div className="mb-4">
      <h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

type ShortcutItemProps = {
  keys: string[];
  description: string;
};

function ShortcutItem({ keys, description }: ShortcutItemProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm">{description}</span>
      <div className="flex gap-1">
        {keys.map((key, i) => (
          <kbd
            key={i}
            className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}
