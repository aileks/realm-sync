import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentForm } from '@/components/DocumentForm';
import type { Id } from '../../convex/_generated/dataModel';

export const Route = createFileRoute('/projects_/$projectId_/documents/new')({
  component: NewDocumentPage,
});

function NewDocumentPage() {
  const navigate = useNavigate();
  const { projectId } = Route.useParams();

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2"
        onClick={() => navigate({ to: '/projects/$projectId/documents', params: { projectId } })}
      >
        <ArrowLeft className="mr-1 size-4" />
        Back to Documents
      </Button>
      <h1 className="mb-6 font-serif text-2xl font-bold">Add Document</h1>
      <DocumentForm
        projectId={projectId as Id<'projects'>}
        onSuccess={(documentId) =>
          navigate({
            to: '/projects/$projectId/documents/$documentId',
            params: { projectId, documentId },
          })
        }
        onCancel={() => navigate({ to: '/projects/$projectId/documents', params: { projectId } })}
      />
    </div>
  );
}
