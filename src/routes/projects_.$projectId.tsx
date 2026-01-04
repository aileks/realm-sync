import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { useState } from 'react';
import {
  FileText,
  Users,
  Lightbulb,
  AlertTriangle,
  Plus,
  Settings,
  ArrowLeft,
  BookOpen,
} from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { ProjectForm } from '@/components/ProjectForm';
import { LoadingState } from '@/components/LoadingState';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/projects_/$projectId')({
  component: ProjectDashboard,
});

function ProjectDashboard() {
  const navigate = useNavigate();
  const { projectId } = Route.useParams();
  const project = useQuery(api.projects.get, { id: projectId as Id<'projects'> });
  const documents = useQuery(api.documents.list, { projectId: projectId as Id<'projects'> });
  const deleteProject = useMutation(api.projects.remove);

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (project === undefined) {
    return <LoadingState message="Loading project..." />;
  }

  if (project === null) {
    return (
      <div className="container mx-auto p-6 text-center">
        <p className="text-muted-foreground">Project not found or you don&apos;t have access.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate({ to: '/projects' })}>
          <ArrowLeft className="mr-2 size-4" />
          Back to Projects
        </Button>
      </div>
    );
  }

  const stats = project.stats ?? {
    documentCount: 0,
    entityCount: 0,
    factCount: 0,
    alertCount: 0,
  };

  async function handleDelete() {
    await deleteProject({ id: projectId as Id<'projects'> });
    void navigate({ to: '/projects' });
  }

  if (isEditing) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <h1 className="mb-6 font-serif text-2xl font-bold">Edit Project</h1>
        <ProjectForm
          project={project}
          onSuccess={() => setIsEditing(false)}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2"
            onClick={() => navigate({ to: '/projects' })}
          >
            <ArrowLeft className="mr-1 size-4" />
            Projects
          </Button>
          <h1 className="font-serif text-3xl font-bold">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
          <Settings className="mr-2 size-4" />
          Settings
        </Button>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FileText}
          label="Documents"
          value={stats.documentCount}
          onClick={() => navigate({ to: '/projects/$projectId/documents', params: { projectId } })}
        />
        <StatCard
          icon={Users}
          label="Entities"
          value={stats.entityCount}
          variant="entity-character"
          onClick={() => navigate({ to: '/projects/$projectId/entities', params: { projectId } })}
        />
        <StatCard
          icon={Lightbulb}
          label="Facts"
          value={stats.factCount}
          variant="entity-concept"
          onClick={() => navigate({ to: '/projects/$projectId/facts', params: { projectId } })}
        />
        <StatCard
          icon={AlertTriangle}
          label="Alerts"
          value={stats.alertCount}
          variant={stats.alertCount > 0 ? 'destructive' : undefined}
          onClick={() => navigate({ to: '/projects/$projectId/alerts', params: { projectId } })}
        />
      </div>

      <div className="mb-8">
        <Button
          size="lg"
          className="w-full sm:w-auto"
          onClick={() => navigate({ to: '/projects/$projectId/canon', params: { projectId } })}
        >
          <BookOpen className="mr-2 size-5" />
          Browse Canon
        </Button>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-xl font-semibold">Recent Documents</h2>
        <Button
          onClick={() =>
            navigate({ to: '/projects/$projectId/documents/new', params: { projectId } })
          }
        >
          <Plus className="mr-2 size-4" />
          Add Document
        </Button>
      </div>

      {documents === undefined ?
        <LoadingState message="Loading documents..." />
      : documents.length === 0 ?
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No documents yet. Add your first document to get started.
            </p>
          </CardContent>
        </Card>
      : <div className="space-y-2">
          {documents.slice(0, 5).map((doc: (typeof documents)[number]) => (
            <Card
              key={doc._id}
              size="sm"
              className="hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() =>
                navigate({
                  to: '/projects/$projectId/documents/$documentId',
                  params: { projectId, documentId: doc._id },
                })
              }
            >
              <CardHeader className="py-3">
                <CardTitle className="text-base font-medium">{doc.title}</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="secondary">{doc.contentType}</Badge>
                  <span className="text-muted-foreground text-sm">{doc.wordCount} words</span>
                </div>
              </CardHeader>
            </Card>
          ))}
          {documents.length > 5 && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() =>
                navigate({ to: '/projects/$projectId/documents', params: { projectId } })
              }
            >
              View all {documents.length} documents
            </Button>
          )}
        </div>
      }

      <div className="border-border mt-12 border-t pt-6">
        <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
          Delete Project
        </Button>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{project.name}&quot; and all its documents,
              entities, and facts. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type StatCardProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  variant?: 'entity-character' | 'entity-concept' | 'destructive';
  onClick?: () => void;
};

function StatCard({ icon: Icon, label, value, variant, onClick }: StatCardProps) {
  return (
    <Card
      className={cn(
        'hover:ring-primary/20 cursor-pointer transition-all hover:ring-2',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex size-10 items-center justify-center rounded-full',
              variant === 'entity-character' && 'bg-entity-character/10 text-entity-character',
              variant === 'entity-concept' && 'bg-entity-concept/10 text-entity-concept',
              variant === 'destructive' && 'bg-destructive/10 text-destructive',
              !variant && 'bg-primary/10 text-primary'
            )}
          >
            <Icon className="size-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-muted-foreground text-sm">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
