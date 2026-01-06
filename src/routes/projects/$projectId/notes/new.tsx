import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { useState } from 'react';
import { ArrowLeft, Save, Pin } from 'lucide-react';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoadingState } from '@/components/LoadingState';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/projects/$projectId/notes/new')({
  component: NewNotePage,
});

function NewNotePage() {
  const navigate = useNavigate();
  const { projectId } = Route.useParams();
  const project = useQuery(api.projects.get, { id: projectId as Id<'projects'> });
  const createNote = useMutation(api.notes.create);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [pinned, setPinned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (project === undefined) {
    return <LoadingState message="Loading..." />;
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

  async function handleSave() {
    if (!title.trim() && !content.trim()) return;
    setIsSaving(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const noteId = await createNote({
        projectId: projectId as Id<'projects'>,
        title: title.trim() || 'Untitled',
        content,
        tags,
        pinned,
      });
      void navigate({
        to: '/projects/$projectId/notes/$noteId',
        params: { projectId, noteId },
      });
    } finally {
      setIsSaving(false);
    }
  }

  const canSave = title.trim() || content.trim();

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
          <Button
            variant={pinned ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPinned(!pinned)}
            title={pinned ? 'Pinned' : 'Pin this note'}
            className={cn('transition-all', pinned && 'ring-primary/20 ring-2')}
          >
            <Pin className={cn('size-4', pinned && 'fill-current')} />
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            size="sm"
            className="min-w-[100px] font-semibold shadow-sm"
          >
            {isSaving ?
              <span className="animate-pulse">Saving...</span>
            : <>
                <Save className="mr-2 size-4" />
                Save Note
              </>
            }
          </Button>
        </div>
      </div>

      <div
        className={cn(
          'group bg-card relative min-h-[60vh] rounded-xl border p-8 shadow-sm transition-all duration-500',
          pinned ? 'border-primary/20 bg-primary/5' : 'border-border/40 hover:border-border/80'
        )}
      >
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled Note"
          className="placeholder:text-muted-foreground/40 mb-6 h-auto border-none bg-transparent px-0 font-serif text-4xl font-bold tracking-tight focus-visible:ring-0 lg:text-5xl"
        />

        <div className="text-muted-foreground mb-6 flex items-center gap-2">
          <span className="font-mono text-xs tracking-wider uppercase opacity-50">Tags:</span>
          <Input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="world, character, plot..."
            className="placeholder:text-muted-foreground/40 h-auto border-none bg-transparent p-0 text-sm focus-visible:ring-0"
          />
        </div>

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing..."
          className="placeholder:text-muted-foreground/30 min-h-[400px] resize-none border-none bg-transparent px-0 text-lg leading-relaxed focus-visible:ring-0"
        />
      </div>
    </div>
  );
}
