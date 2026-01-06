import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, usePaginatedQuery } from 'convex/react';
import { useState, useMemo } from 'react';
import { Lightbulb, Search, ArrowLeft, Filter } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import type { Id, Doc } from '../../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FactCard } from '@/components/FactCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { PaginatedGrid } from '@/components/PaginatedGrid';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PAGE_SIZE = 24;

type FactStatus = 'pending' | 'confirmed' | 'rejected';

export const Route = createFileRoute('/projects/$projectId/facts')({
  component: FactsPage,
});

function FactsPage() {
  const navigate = useNavigate();
  const { projectId } = Route.useParams();
  const project = useQuery(api.projects.get, { id: projectId as Id<'projects'> });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const confirmFact = useMutation(api.facts.confirm);
  const rejectFact = useMutation(api.facts.reject);

  const paginatedArgs = useMemo(
    () => ({
      projectId: projectId as Id<'projects'>,
      status: statusFilter !== 'all' ? (statusFilter as FactStatus) : undefined,
    }),
    [projectId, statusFilter]
  );

  const { results, status, loadMore } = usePaginatedQuery(
    api.facts.listByProjectPaginated,
    paginatedArgs,
    { initialNumItems: PAGE_SIZE }
  );

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return results;
    const query = searchQuery.toLowerCase();
    return results.filter(
      (fact) =>
        fact.subject.toLowerCase().includes(query) ||
        fact.object.toLowerCase().includes(query) ||
        fact.predicate.toLowerCase().includes(query)
    );
  }, [results, searchQuery]);

  if (project === undefined) {
    return <LoadingState message="Loading facts..." />;
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
          <h1 className="font-serif text-3xl font-bold">Facts</h1>
          {status !== 'LoadingFirstPage' && (
            <div className="text-muted-foreground text-sm">
              {filteredResults.length} loaded
              {status !== 'Exhausted' && '+'}
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
          <Input
            placeholder="Search facts (subject, predicate, object)..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'all')}>
          <SelectTrigger className="w-[180px]">
            <Filter className="text-muted-foreground mr-2 size-4" />
            <SelectValue>Filter by status</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <PaginatedGrid
        results={filteredResults}
        status={status}
        loadMore={loadMore}
        pageSize={PAGE_SIZE}
        emptyState={
          results.length === 0 ?
            <EmptyState
              icon={<Lightbulb className="text-muted-foreground size-8" />}
              title="No facts yet"
              description="Facts will appear here once extracted from your documents."
            />
          : <EmptyState
              title="No matching facts"
              description="Try adjusting your search."
              action={
                <Button variant="outline" onClick={() => setSearchQuery('')}>
                  Clear Search
                </Button>
              }
            />
        }
        renderItem={(fact: Doc<'facts'>) => (
          <FactCard
            fact={fact}
            onConfirm={(id) => confirmFact({ id })}
            onReject={(id) => rejectFact({ id })}
          />
        )}
      />
    </div>
  );
}
