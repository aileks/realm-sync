import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { useState, useMemo } from 'react';
import { StickyNote, Search, ArrowLeft, Plus, Pin, PinOff, Trash2 } from 'lucide-react';
import { api } from '../../../../../convex/_generated/api';
import type { Id, Doc } from '../../../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/projects/$projectId/notes/')({
  component: NotesPage,
});

function NotesPage() {
  const navigate = useNavigate();
  const { projectId } = Route.useParams();
  const project = useQuery(api.projects.get, { id: projectId as Id<'projects'> });
  const notes = useQuery(api.notes.list, { projectId: projectId as Id<'projects'> });
  const deleteNote = useMutation(api.notes.remove);
  const togglePin = useMutation(api.notes.togglePin);

  const [searchQuery, setSearchQuery] = useState('');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [deletingNote, setDeletingNote] = useState<{
    _id: Id<'notes'>;
    title: string;
  } | null>(null);

  const filteredNotes = useMemo(() => {
    if (!notes) return [];
    let result = notes;

    if (showPinnedOnly) {
      result = result.filter((n) => n.pinned);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (n) => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query)
      );
    }

    return [...result].toSorted((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [notes, searchQuery, showPinnedOnly]);

  if (project === undefined || notes === undefined) {
    return <LoadingState message="Loading notes..." />;
  }

  if (project === null) {
    return (
      <div className="container mx-auto p-6 text-center">
        <p className="text-muted-foreground">Project not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate({ to: '/projects' })}>
          Back to Projects
        </Button>
      </div>
    );
  }

  async function handleDelete() {
    if (!deletingNote) return;
    await deleteNote({ id: deletingNote._id });
    setDeletingNote(null);
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground mb-4 -ml-2 h-auto p-2"
          onClick={() => navigate({ to: '/projects/$projectId', params: { projectId } })}
        >
          <ArrowLeft className="mr-1 size-4" />
          {project.name}
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-serif text-4xl font-bold tracking-tight">Notes</h1>
          <Button
            onClick={() =>
              navigate({ to: '/projects/$projectId/notes/new', params: { projectId } })
            }
            className="shadow-sm"
          >
            <Plus className="mr-2 size-4" />
            New Note
          </Button>
        </div>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            placeholder="Search notes..."
            className="bg-background/50 focus:bg-background pl-9 backdrop-blur-sm transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant={showPinnedOnly ? 'default' : 'outline'}
          onClick={() => setShowPinnedOnly(!showPinnedOnly)}
          className={cn('transition-all', showPinnedOnly && 'ring-primary/20 shadow-md ring-2')}
        >
          <Pin className={cn('mr-2 size-4 transition-transform', showPinnedOnly && '-rotate-45')} />
          {showPinnedOnly ? 'Pinned Only' : 'All Notes'}
        </Button>
      </div>

      {filteredNotes.length === 0 ?
        notes.length === 0 ?
          <EmptyState
            icon={<StickyNote className="text-muted-foreground size-8" />}
            title="No notes yet"
            description="Create notes to keep track of ideas, world-building details, and more."
            action={
              <Button
                onClick={() =>
                  navigate({ to: '/projects/$projectId/notes/new', params: { projectId } })
                }
              >
                <Plus className="mr-2 size-4" />
                New Note
              </Button>
            }
          />
        : <EmptyState
            title="No matching notes"
            description="Try adjusting your search or filter."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setShowPinnedOnly(false);
                }}
              >
                Clear Filters
              </Button>
            }
          />

      : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((note: Doc<'notes'>) => (
            <NoteCard
              key={note._id}
              note={note}
              onClick={() =>
                navigate({
                  to: '/projects/$projectId/notes/$noteId',
                  params: { projectId, noteId: note._id },
                })
              }
              onTogglePin={() => togglePin({ id: note._id })}
              onDelete={() => setDeletingNote({ _id: note._id, title: note.title })}
            />
          ))}
        </div>
      }

      <AlertDialog open={!!deletingNote} onOpenChange={(open) => !open && setDeletingNote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deletingNote?.title}&quot;. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type NoteCardProps = {
  note: Doc<'notes'>;
  onClick: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
};

function NoteCard({ note, onClick, onTogglePin, onDelete }: NoteCardProps) {
  const previewContent = note.content.slice(0, 180) + (note.content.length > 180 ? '...' : '');

  return (
    <button
      type="button"
      className={cn(
        'group bg-card relative flex w-full flex-col justify-between rounded-xl border p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg',
        note.pinned ?
          'border-primary/20 bg-primary/5 shadow-sm'
        : 'border-border/40 hover:border-border/80'
      )}
      onClick={onClick}
    >
      <div className="mb-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3
            className={cn(
              'line-clamp-2 font-serif text-lg leading-tight font-bold tracking-tight',
              !note.title && 'text-muted-foreground italic'
            )}
          >
            {note.title || 'Untitled Note'}
          </h3>
          {note.pinned && <Pin className="text-primary fill-primary/20 size-4 shrink-0" />}
        </div>

        <p className="text-muted-foreground line-clamp-4 min-h-[4rem] text-sm leading-relaxed">
          {previewContent || <span className="italic opacity-50">No content</span>}
        </p>
      </div>

      <div className="mt-auto pt-3">
        {note.tags && note.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {note.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="bg-secondary/50 text-secondary-foreground ring-border/50 rounded-md px-1.5 py-0.5 text-[10px] font-medium tracking-wider uppercase ring-1"
              >
                {tag}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span className="text-muted-foreground text-[10px] font-medium">
                +{note.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="border-border/40 flex items-center justify-between border-t pt-3">
          <span className="text-muted-foreground/60 font-mono text-xs">
            {new Date(note.updatedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>

          <div
            role="group"
            className="flex gap-1 opacity-0 transition-all duration-200 group-hover:opacity-100"
            onClickCapture={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-7 w-7"
              onClick={onTogglePin}
              title={note.pinned ? 'Unpin' : 'Pin'}
            >
              {note.pinned ?
                <PinOff className="size-3.5" />
              : <Pin className="size-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-7 w-7"
              onClick={onDelete}
              title="Delete"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </button>
  );
}
