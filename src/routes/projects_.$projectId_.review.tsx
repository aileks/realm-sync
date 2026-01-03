import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/projects_/$projectId_/review')({
  component: () => <Outlet />,
});
