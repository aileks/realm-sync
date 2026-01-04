import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useAction } from 'convex/react';
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Save, Loader2, CheckCircle, Clock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import { type FunctionReference } from 'convex/server';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/LoadingState';
import { cn } from '@/lib/utils';

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export const Route = createFileRoute('/projects_/$projectId_/documents/$documentId')({
  component: DocumentEditorPage,
});

function DocumentEditorPage() {
  const navigate = useNavigate();
  const { projectId, documentId } = Route.useParams();
  const document = useQuery(api.documents.get, { id: documentId as Id<'documents'> });
  const updateDocument = useMutation(api.documents.update);
  const chunkAndExtract = useAction(
    (
      api as unknown as {
        'llm/extract': {
          chunkAndExtract: FunctionReference<
            'action',
            'public',
            { documentId: Id<'documents'> },
            { entitiesCreated: number; factsCreated: number }
          >;
        };
      }
    )['llm/extract'].chunkAndExtract
  );

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (document) {
      setTitle(document.title);
      setContent(document.content ?? '');
    }
  }, [document]);

  useEffect(() => {
    if (document) {
      const titleChanged = title !== document.title;
      const contentChanged = content !== (document.content ?? '');
      setHasChanges(titleChanged || contentChanged);
    }
  }, [title, content, document]);

  const save = useCallback(async () => {
    if (!document || !hasChanges || isSaving) return;

    setIsSaving(true);
    try {
      await updateDocument({
        id: document._id,
        title: title.trim(),
        content: content || undefined,
      });
      setLastSaved(new Date());
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  }, [document, hasChanges, isSaving, title, content, updateDocument]);

  useEffect(() => {
    if (!hasChanges) return;

    const timer = setTimeout(() => {
      void save();
    }, 2000);

    return () => clearTimeout(timer);
  }, [hasChanges, save]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        void save();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [save]);

  async function handleExtract() {
    if (!document) return;
    setIsExtracting(true);
    toast.info('Extraction started', {
      description: "You'll be notified when it finishes.",
    });
    try {
      const result = await chunkAndExtract({ documentId: document._id });
      toast.success('Extraction complete', {
        description: `Found ${result.entitiesCreated} entities and ${result.factsCreated} facts.`,
      });
    } catch (error) {
      console.error('Extraction failed:', error);
      toast.error('Extraction failed', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    } finally {
      setIsExtracting(false);
    }
  }

  if (document === undefined) {
    return <LoadingState message="Loading document..." />;
  }

  if (document === null) {
    return (
      <div className="container mx-auto p-6 text-center">
        <p className="text-muted-foreground">Document not found.</p>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => navigate({ to: '/projects/$projectId/documents', params: { projectId } })}
        >
          Back to Documents
        </Button>
      </div>
    );
  }

  const wordCount = countWords(content);

  return (
    <div className="flex h-screen flex-col">
      <header className="border-border bg-card flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              navigate({ to: '/projects/$projectId/documents', params: { projectId } })
            }
          >
            <ArrowLeft className="mr-1 size-4" />
            Documents
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{document.contentType}</Badge>
            <span className="text-muted-foreground text-sm">
              {wordCount.toLocaleString()} words
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExtract}
            disabled={isExtracting || hasChanges || document.processingStatus === 'processing'}
            title={hasChanges ? 'Save changes before extracting' : 'Extract entities and facts'}
          >
            {isExtracting ?
              <Loader2 className="mr-2 size-4 animate-spin" />
            : <Sparkles className="mr-2 size-4 text-purple-500" />}
            Extract
          </Button>
          {isSaving ?
            <span className="text-muted-foreground flex items-center gap-1 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </span>
          : hasChanges ?
            <span className="text-muted-foreground flex items-center gap-1 text-sm">
              <Clock className="size-4" />
              Unsaved changes
            </span>
          : lastSaved ?
            <span className="text-muted-foreground flex items-center gap-1 text-sm">
              <CheckCircle className="size-4" />
              Saved
            </span>
          : null}
          <Button onClick={save} disabled={!hasChanges || isSaving}>
            {isSaving ?
              <Loader2 className="mr-2 size-4 animate-spin" />
            : <Save className="mr-2 size-4" />}
            Save
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-border border-b px-6 py-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title"
            className="border-0 bg-transparent px-0 font-serif text-2xl font-bold focus-visible:ring-0"
          />
        </div>
        <div className="flex-1 overflow-auto p-6">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing..."
            className={cn(
              'min-h-full resize-none border-0 bg-transparent focus-visible:ring-0',
              document.contentType === 'markdown' && 'font-mono'
            )}
          />
        </div>
      </div>
    </div>
  );
}
