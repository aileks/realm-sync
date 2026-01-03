import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { useState } from 'react';
import { Plus, FileText, ArrowLeft } from 'lucide-react';
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
import { DocumentCard } from '@/components/DocumentCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';

export const Route = createFileRoute('/projects/$projectId/documents')({
  component: DocumentsPage,
});

function DocumentsPage() {
  const navigate = useNavigate();
  const { projectId } = Route.useParams();
  const project = useQuery(api.projects.get, { id: projectId as Id<'projects'> });
  const documents = useQuery(api.documents.list, { projectId: projectId as Id<'projects'> });
  const deleteDocument = useMutation(api.documents.remove);

  const [deletingDocument, setDeletingDocument] = useState<{
    _id: Id<'documents'>;
    title: string;
  } | null>(null);

  if (project === undefined || documents === undefined) {
    return <LoadingState message="Loading documents..." />;
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
    if (!deletingDocument) return;
    await deleteDocument({ id: deletingDocument._id });
    setDeletingDocument(null);
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2"
          onClick={() => navigate({ to: '/projects/$projectId', params: { projectId } })}
        >
          <ArrowLeft className="mr-1 size-4" />
          {project.name}
        </Button>
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-3xl font-bold">Documents</h1>
          <Button
            onClick={() =>
              navigate({ to: '/projects/$projectId/documents/new', params: { projectId } })
            }
          >
            <Plus className="mr-2 size-4" />
            Add Document
          </Button>
        </div>
      </div>

      {documents.length === 0 ?
        <EmptyState
          icon={<FileText className="text-muted-foreground size-8" />}
          title="No documents yet"
          description="Add your first document to start building your world's canon."
          action={
            <Button
              onClick={() =>
                navigate({ to: '/projects/$projectId/documents/new', params: { projectId } })
              }
            >
              <Plus className="mr-2 size-4" />
              Add Document
            </Button>
          }
        />
      : <div className="space-y-2">
          {documents.map((doc: (typeof documents)[number]) => (
            <DocumentCard
              key={doc._id}
              document={doc}
              onClick={() =>
                navigate({
                  to: '/projects/$projectId/documents/$documentId',
                  params: { projectId, documentId: doc._id },
                })
              }
              onEdit={(d) =>
                navigate({
                  to: '/projects/$projectId/documents/$documentId',
                  params: { projectId, documentId: d._id },
                })
              }
              onDelete={(d) => setDeletingDocument({ _id: d._id, title: d.title })}
            />
          ))}
        </div>
      }

      <AlertDialog
        open={!!deletingDocument}
        onOpenChange={(open) => !open && setDeletingDocument(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deletingDocument?.title}&quot;. This action cannot
              be undone.
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
