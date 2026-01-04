import {createFileRoute, useNavigate} from '@tanstack/react-router';
import {useQuery} from 'convex/react';
import {Sparkles, FileText, ArrowLeft, CheckCircle2} from 'lucide-react';
import {api} from '../../convex/_generated/api';
import type {Id} from '../../convex/_generated/dataModel';
import {Button} from '@/components/ui/button';
import {Card, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {EmptyState} from '@/components/EmptyState';
import {LoadingState} from '@/components/LoadingState';

export const Route = createFileRoute('/projects_/$projectId_/review/')({
  component: ReviewQueuePage,
});

function ReviewQueuePage() {
  const navigate = useNavigate();
  const {projectId} = Route.useParams();
  const project = useQuery(api.projects.get, {id: projectId as Id<'projects'>});
  const docsNeedingReview = useQuery(api.documents.listNeedingReview, {
    projectId: projectId as Id<'projects'>,
  });

  if (project === undefined || docsNeedingReview === undefined) {
    return <LoadingState message="Loading review queue..." />;
  }

  if (project === null) {
    return (
      <div className="container mx-auto flex h-[50vh] flex-col items-center justify-center p-6 text-center">
        <p className="text-muted-foreground mb-4">Project not found.</p>
        <Button variant="outline" onClick={() => navigate({to: '/projects'})}>
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-6 py-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground mb-4 -ml-2"
          onClick={() => navigate({to: '/projects/$projectId', params: {projectId}})}
        >
          <ArrowLeft className="mr-1 size-4" />
          {project.name}
        </Button>
        <div className="flex items-start gap-4">
          <div className="bg-primary/10 text-primary mt-1 flex size-12 items-center justify-center rounded-xl shadow-sm">
            <Sparkles className="size-6" />
          </div>
          <div>
            <h1 className="text-foreground font-serif text-3xl font-bold tracking-tight">
              Review Extractions
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Review and confirm entities and facts extracted by Vellum.
            </p>
          </div>
        </div>
      </div>

      {docsNeedingReview.length === 0 ?
        <div className="border-border/50 bg-muted/20 rounded-xl border border-dashed p-12">
          <EmptyState
            icon={<CheckCircle2 className="size-12 text-green-500/80" />}
            title="All caught up!"
            description="No documents need review. All extracted entities and facts have been processed."
            action={
              <Button
                variant="default"
                className="mt-4"
                onClick={() =>
                  navigate({to: '/projects/$projectId/documents', params: {projectId}})
                }
              >
                <FileText className="mr-2 size-4" />
                View Documents
              </Button>
            }
          />
        </div>
      : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {docsNeedingReview.map((doc) => (
            <Card
              key={doc._id}
              className="group border-border/60 bg-card hover:border-primary/50 hover:bg-muted/50 cursor-pointer transition-all duration-300 hover:shadow-md"
              onClick={() =>
                navigate({
                  to: '/projects/$projectId/review/$documentId',
                  params: {projectId, documentId: doc._id},
                })
              }
            >
              <CardHeader className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <CardTitle className="group-hover:text-primary line-clamp-2 font-serif text-lg leading-tight font-medium transition-colors">
                        {doc.title}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {new Date(doc._creationTime).toLocaleDateString()}
                      </CardDescription>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary hover:bg-primary/20 border-transparent"
                      >
                        {doc.pendingEntityCount} entities
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="bg-secondary text-secondary-foreground border-transparent"
                      >
                        {doc.pendingFactCount} facts
                      </Badge>
                    </div>
                  </div>

                  <div className="bg-background group-hover:border-primary/30 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm transition-colors">
                    <ArrowLeft className="text-muted-foreground group-hover:text-primary size-4 rotate-180 transition-colors" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      }
    </div>
  );
}
