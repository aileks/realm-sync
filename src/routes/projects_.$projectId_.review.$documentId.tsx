import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { useState, useMemo } from 'react';
import { ArrowLeft, FileText, Users, List, CheckCircle2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ReviewEntityCard } from '@/components/ReviewEntityCard';
import { FactCard } from '@/components/FactCard';
import { LoadingState } from '@/components/LoadingState';

export const Route = createFileRoute('/projects_/$projectId_/review/$documentId')({
  component: ReviewDocumentPage,
});

function ReviewDocumentPage() {
  const navigate = useNavigate();
  const { projectId, documentId } = Route.useParams();

  const document = useQuery(api.documents.get, { id: documentId as Id<'documents'> });
  const pendingEntities = useQuery(api.entities.listByProject, {
    projectId: projectId as Id<'projects'>,
    status: 'pending',
  });
  const facts = useQuery(api.facts.listByDocument, { documentId: documentId as Id<'documents'> });

  const confirmEntity = useMutation(api.entities.confirm);
  const rejectEntity = useMutation(api.entities.reject);
  const mergeEntities = useMutation(api.entities.merge);
  const confirmFact = useMutation(api.facts.confirm);
  const rejectFact = useMutation(api.facts.reject);

  const [highlightedRange, setHighlightedRange] = useState<{ start: number; end: number } | null>(
    null
  );

  const documentEntities = useMemo(() => {
    if (!pendingEntities || !document) return [];
    return pendingEntities.filter((e) => e.firstMentionedIn === document._id);
  }, [pendingEntities, document]);

  const pendingFacts = useMemo(() => {
    if (!facts) return [];
    return facts.filter((f) => f.status === 'pending');
  }, [facts]);

  if (document === undefined || pendingEntities === undefined || facts === undefined) {
    return <LoadingState message="Loading document for review..." />;
  }

  if (document === null) {
    return (
      <div className="container mx-auto flex h-[50vh] flex-col items-center justify-center p-6 text-center">
        <p className="text-muted-foreground mb-4">Document not found.</p>
        <Button
          variant="outline"
          onClick={() => navigate({ to: '/projects/$projectId/review', params: { projectId } })}
        >
          Back to Review Queue
        </Button>
      </div>
    );
  }

  async function handleConfirmEntity(id: Id<'entities'>) {
    await confirmEntity({ id });
  }

  async function handleRejectEntity(id: Id<'entities'>) {
    await rejectEntity({ id });
  }

  async function handleMergeEntity(sourceId: Id<'entities'>, targetId: Id<'entities'>) {
    await mergeEntities({ sourceId, targetId });
  }

  async function handleConfirmFact(id: Id<'facts'>) {
    await confirmFact({ id });
  }

  async function handleRejectFact(id: Id<'facts'>) {
    await rejectFact({ id });
  }

  function handleHighlight(position: { start: number; end: number } | undefined) {
    setHighlightedRange(position ?? null);
  }

  function renderHighlightedContent(content: string) {
    if (!highlightedRange) {
      return <Markdown>{content}</Markdown>;
    }

    const { start, end } = highlightedRange;
    const before = content.slice(0, start);
    const highlighted = content.slice(start, end);
    const after = content.slice(end);

    return (
      <>
        <Markdown>{before}</Markdown>
        <mark className="text-foreground inline rounded-sm bg-amber-400/40 px-0.5 shadow-sm ring-1 ring-amber-500/50 dark:bg-amber-500/40">
          {highlighted}
        </mark>
        <Markdown>{after}</Markdown>
      </>
    );
  }

  const totalPending = documentEntities.length + pendingFacts.length;

  return (
    <div className="bg-background flex h-[calc(100vh-4rem)] flex-col">
      <div className="border-border bg-card/50 z-10 border-b px-6 py-4 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground mb-2 -ml-2"
          onClick={() => navigate({ to: '/projects/$projectId/review', params: { projectId } })}
        >
          <ArrowLeft className="mr-1 size-4" />
          Review Queue
        </Button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
              <FileText className="size-5" />
            </div>
            <div>
              <h1 className="font-serif text-xl leading-none font-bold">{document.title}</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {totalPending} items pending review
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="h-7 px-2.5 font-normal">
              <Users className="text-primary mr-1.5 size-3.5" />
              {documentEntities.length} entities
            </Badge>
            <Badge variant="outline" className="h-7 px-2.5 font-normal">
              <List className="text-secondary-foreground mr-1.5 size-3.5" />
              {pendingFacts.length} facts
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="border-border bg-muted/5 flex-1 overflow-y-auto border-r p-6 md:p-8">
          <div className="border-border bg-card mx-auto max-w-3xl rounded-xl border p-8 shadow-sm">
            <div className="prose prose-sm md:prose-base dark:prose-invert text-foreground/90 max-w-none font-serif leading-loose">
              {document.content ?
                renderHighlightedContent(document.content)
              : <p className="text-muted-foreground text-center italic">No content available</p>}
            </div>
          </div>
        </div>

        <div className="bg-background w-[400px] shrink-0 overflow-y-auto p-6 lg:w-[480px]">
          {documentEntities.length > 0 && (
            <div className="animate-in slide-in-from-right-4 fade-in mb-8 duration-500">
              <h2 className="text-foreground mb-4 flex items-center gap-2 font-serif text-lg font-semibold">
                <Users className="text-primary size-5" />
                Entities
                <Badge variant="secondary" className="ml-auto text-xs">
                  {documentEntities.length}
                </Badge>
              </h2>
              <div className="space-y-3">
                {documentEntities.map((entity) => (
                  <ReviewEntityCard
                    key={entity._id}
                    projectId={projectId as Id<'projects'>}
                    entity={entity}
                    onConfirm={handleConfirmEntity}
                    onReject={handleRejectEntity}
                    onMerge={handleMergeEntity}
                  />
                ))}
              </div>
            </div>
          )}

          {documentEntities.length > 0 && pendingFacts.length > 0 && (
            <Separator className="my-6 opacity-50" />
          )}

          {pendingFacts.length > 0 && (
            <div className="animate-in slide-in-from-right-4 fade-in delay-150 duration-500">
              <h2 className="text-foreground mb-4 flex items-center gap-2 font-serif text-lg font-semibold">
                <List className="text-secondary-foreground size-5" />
                Facts
                <Badge variant="secondary" className="ml-auto text-xs">
                  {pendingFacts.length}
                </Badge>
              </h2>
              <div className="space-y-3">
                {pendingFacts.map((fact) => (
                  <FactCard
                    key={fact._id}
                    fact={fact}
                    onConfirm={handleConfirmFact}
                    onReject={handleRejectFact}
                    onHighlight={handleHighlight}
                  />
                ))}
              </div>
            </div>
          )}

          {totalPending === 0 && (
            <div className="animate-in zoom-in-95 flex flex-col items-center justify-center py-20 text-center duration-500">
              <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-green-500/10 ring-1 ring-green-500/20">
                <CheckCircle2 className="size-10 text-green-500" />
              </div>
              <h3 className="mb-2 font-serif text-2xl font-semibold">All reviewed!</h3>
              <p className="text-muted-foreground mb-8 max-w-[260px]">
                All entities and facts from this document have been processed successfully.
              </p>
              <Button
                variant="default"
                onClick={() =>
                  navigate({ to: '/projects/$projectId/review', params: { projectId } })
                }
              >
                Return to Queue
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
