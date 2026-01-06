import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { StickyNote, Plus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

type EntityNotesPanelProps = {
  entityId: Id<'entities'>;
  className?: string;
};

export function EntityNotesPanel({ entityId, className }: EntityNotesPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" className={className}>
            <StickyNote className="mr-2 size-4" />
            Notes
          </Button>
        }
      />
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Entity Notes</SheetTitle>
          <SheetDescription>Annotations and observations about this entity</SheetDescription>
        </SheetHeader>
        <EntityNotesContent entityId={entityId} />
      </SheetContent>
    </Sheet>
  );
}

type EntityNotesContentProps = {
  entityId: Id<'entities'>;
};

function EntityNotesContent({ entityId }: EntityNotesContentProps) {
  const notes = useQuery(api.entityNotes.list, { entityId });
  const createNote = useMutation(api.entityNotes.create);
  const removeNote = useMutation(api.entityNotes.remove);

  const [showAddForm, setShowAddForm] = useState(false);
  const [content, setContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddNote = async () => {
    if (!content.trim()) {
      toast.error('Note content is required');
      return;
    }

    setIsAdding(true);
    try {
      await createNote({ entityId, content: content.trim() });
      setContent('');
      setShowAddForm(false);
      toast.success('Note added');
    } catch {
      toast.error('Failed to add note');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteNote = async (noteId: Id<'entityNotes'>) => {
    try {
      await removeNote({ id: noteId });
      toast.success('Note deleted');
    } catch {
      toast.error('Failed to delete note');
    }
  };

  if (notes === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden p-6 pt-0">
      {!showAddForm && (
        <Button variant="outline" size="sm" className="w-full" onClick={() => setShowAddForm(true)}>
          <Plus className="mr-2 size-4" />
          Add Note
        </Button>
      )}

      {showAddForm && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <Textarea
              placeholder="Write your note..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  setContent('');
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddNote} disabled={isAdding || !content.trim()}>
                {isAdding ?
                  <Loader2 className="mr-2 size-4 animate-spin" />
                : null}
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto">
        {notes.length === 0 && !showAddForm ?
          <div className="text-muted-foreground py-8 text-center text-sm">
            No notes yet. Add one to track observations about this entity.
          </div>
        : notes.map((note) => (
            <Card key={note._id} className="group transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <p className="line-clamp-4 text-sm whitespace-pre-wrap">{note.content}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                    onClick={() => handleDeleteNote(note._id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        }
      </div>
    </div>
  );
}
