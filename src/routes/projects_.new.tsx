import {createFileRoute, useNavigate} from '@tanstack/react-router';
import {ProjectForm} from '@/components/ProjectForm';

export const Route = createFileRoute('/projects_/new')({
  component: NewProjectPage,
});

function NewProjectPage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <h1 className="mb-6 font-serif text-2xl font-bold">Create New Project</h1>
      <ProjectForm
        onSuccess={(projectId) => navigate({to: '/projects/$projectId', params: {projectId}})}
        onCancel={() => navigate({to: '/projects'})}
      />
    </div>
  );
}
