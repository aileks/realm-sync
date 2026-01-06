import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Pin, PinOff, Trash2 } from 'lucide-react';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

export const Route = createFileRoute('/projects/$projectId/notes/$noteId')({
  component: NoteDetailPage,
});

function NoteDetailPage() {
  const navigate = useNavigate();
  const { projectId, noteId } = Route.useParams();
  const note = useQuery(api.notes.get, { id: noteId as Id<'notes'> });
  const project = useQuery(api.projects.get, { id: projectId as Id<'projects'> });
  const updateNote = useMutation(api.notes.update);
  const togglePin = useMutation(api.notes.togglePin);
  const deleteNote = useMutation(api.notes.remove);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setTagsInput(note.tags?.join(', ') ?? '');
      setIsDirty(false);
    }
  }, [note]);

  if (note === undefined || project === undefined) {
    return <LoadingState message="Loading note..." />;
  }

  if (note === null) {
    return (
      <div className="container mx-auto p-6 text-center">
        <p className="text-muted-foreground">Note not found.</p>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => navigate({ to: '/projects/$projectId/notes', params: { projectId } })}
        >
          Back to Notes
        </Button>
      </div>
    );
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

  function handleChange(field: 'title' | 'content' | 'tags', value: string) {
    setIsDirty(true);
    if (field === 'title') setTitle(value);
    else if (field === 'content') setContent(value);
    else setTagsInput(value);
  }

  async function handleSave() {
    if (!isDirty) return;
    setIsSaving(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      await updateNote({
        id: noteId as Id<'notes'>,
        title,
        content,
        tags,
      });
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTogglePin() {
    await togglePin({ id: noteId as Id<'notes'> });
  }

  async function handleDelete() {
    await deleteNote({ id: noteId as Id<'notes'> });
    void navigate({ to: '/projects/$projectId/notes', params: { projectId } });
  }

  return (
    <div className="container mx-auto max-w-3xl p-6 lg:p-10">
      <div className="mb-8 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground -ml-2"
          onClick={() => navigate({ to: '/projects/$projectId/notes', params: { projectId } })}
        >
          <ArrowLeft className="mr-1 size-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <div className="border-border/50 mr-2 flex items-center border-r pr-2">
            <span className="text-muted-foreground mr-3 font-mono text-xs">
              {isDirty ? 'Unsaved changes' : 'Saved'}
            </span>
          </div>
          <Button
            variant={note.pinned ? 'default' : 'ghost'}
            size="sm"
            onClick={handleTogglePin}
            title={note.pinned ? 'Unpin' : 'Pin'}
            className={cn('transition-all', note.pinned && 'ring-primary/20 ring-2')}
          >
            {note.pinned ?
              <PinOff className="size-4" />
            : <Pin className="size-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => setShowDeleteDialog(true)}
            title="Delete"
          >
            <Trash2 className="size-4" />
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            size="sm"
            className={cn(
              'min-w-[100px] font-semibold shadow-sm transition-all',
              isDirty && 'ring-primary/20 ring-2'
            )}
          >
            <Save className="mr-2 size-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          'group bg-card relative min-h-[60vh] rounded-xl border p-8 shadow-sm transition-all duration-500',
          note.pinned ? 'border-primary/20 bg-primary/5' : 'border-border/40 hover:border-border/80'
        )}
      >
        <Input
          value={title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Untitled Note"
          className="placeholder:text-muted-foreground/40 mb-6 h-auto border-none bg-transparent px-0 font-serif text-4xl font-bold tracking-tight focus-visible:ring-0 lg:text-5xl"
        />

        <div className="text-muted-foreground border-border/30 mb-6 flex items-center gap-2 border-b pb-4">
          <span className="font-mono text-xs tracking-wider uppercase opacity-50">Tags:</span>
          <Input
            value={tagsInput}
            onChange={(e) => handleChange('tags', e.target.value)}
            placeholder="world, character, plot..."
            className="placeholder:text-muted-foreground/40 h-auto border-none bg-transparent p-0 text-sm focus-visible:ring-0"
          />
        </div>

        <Textarea
          value={content}
          onChange={(e) => handleChange('content', e.target.value)}
          placeholder="Start writing..."
          className="placeholder:text-muted-foreground/30 min-h-[400px] resize-none border-none bg-transparent px-0 text-lg leading-relaxed focus-visible:ring-0"
        />

        <div className="border-border/30 text-muted-foreground/60 mt-8 flex items-center justify-between border-t pt-4 font-mono text-xs">
          <span>
            Created{' '}
            {new Date(note.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          {note.createdAt !== note.updatedAt && (
            <span>
              Last updated{' '}
              {new Date(note.updatedAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{note.title || 'Untitled'}&quot;. This action
              cannot be undone.
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
