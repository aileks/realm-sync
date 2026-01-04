import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { useConvexAuth } from 'convex/react';
import { useState, useEffect } from 'react';
import { Plus, FolderOpen } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
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
import { ProjectCard } from '@/components/ProjectCard';
import { ProjectForm } from '@/components/ProjectForm';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';

export const Route = createFileRoute('/projects')({
  component: ProjectsPage,
});

function ProjectsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const projects = useQuery(api.projects.list);
  const deleteProject = useMutation(api.projects.remove);

  const [editingProject, setEditingProject] = useState<
    Parameters<typeof ProjectForm>[0]['project'] | null
  >(null);
  const [deletingProject, setDeletingProject] = useState<{
    _id: Id<'projects'>;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      void navigate({ to: '/auth' });
    }
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading || projects === undefined) {
    return <LoadingState message="Loading projects..." />;
  }

  async function handleDelete() {
    if (!deletingProject) return;
    await deleteProject({ id: deletingProject._id });
    setDeletingProject(null);
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage your world-building projects and track canon
          </p>
        </div>
        <Button onClick={() => navigate({ to: '/projects/new' })}>
          <Plus className="mr-2 size-4" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ?
        <EmptyState
          icon={<FolderOpen className="text-muted-foreground size-8" />}
          title="No projects yet"
          description="Create your first project to start tracking your world's canon."
          action={
            <Button onClick={() => navigate({ to: '/projects/new' })}>
              <Plus className="mr-2 size-4" />
              Create Project
            </Button>
          }
        />
      : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: (typeof projects)[number]) => (
            <ProjectCard
              key={project._id}
              project={project}
              onEdit={(p: (typeof projects)[number]) => setEditingProject(p)}
              onDelete={(p: (typeof projects)[number]) =>
                setDeletingProject({ _id: p._id, name: p.name })
              }
            />
          ))}
        </div>
      }

      <AlertDialog
        open={!!editingProject}
        onOpenChange={(open) => !open && setEditingProject(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Project</AlertDialogTitle>
          </AlertDialogHeader>
          {editingProject && (
            <ProjectForm
              project={editingProject}
              onSuccess={() => setEditingProject(null)}
              onCancel={() => setEditingProject(null)}
            />
          )}
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deletingProject}
        onOpenChange={(open) => !open && setDeletingProject(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deletingProject?.name}&quot; and all its
              documents, entities, and facts. This action cannot be undone.
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
