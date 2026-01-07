import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, usePaginatedQuery } from 'convex/react';
import { useState, useMemo } from 'react';
import {
  Lightbulb,
  Search,
  ArrowLeft,
  Filter,
  Plus,
  ArrowRight,
  Quote,
  Trash2,
} from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import type { Id, Doc } from '../../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FactCard } from '@/components/FactCard';
import { FactForm } from '@/components/FactForm';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { PaginatedGrid } from '@/components/PaginatedGrid';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFact, setSelectedFact] = useState<Doc<'facts'> | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const confirmFact = useMutation(api.facts.confirm);
  const rejectFact = useMutation(api.facts.reject);
  const deleteFact = useMutation(api.facts.remove);

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
          <div className="flex items-center gap-4">
            {status !== 'LoadingFirstPage' && (
              <div className="text-muted-foreground text-sm">
                {filteredResults.length} loaded
                {status !== 'Exhausted' && '+'}
              </div>
            )}
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 size-4" />
              Add Fact
            </Button>
          </div>
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
          <div
            role="button"
            tabIndex={0}
            className="w-full cursor-pointer text-left"
            onClick={() => setSelectedFact(fact)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedFact(fact);
              }
            }}
          >
            <FactCard
              fact={fact}
              onConfirm={(id) => confirmFact({ id })}
              onReject={(id) => rejectFact({ id })}
            />
          </div>
        )}
      />

      <AlertDialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Fact</AlertDialogTitle>
          </AlertDialogHeader>
          <FactForm
            projectId={projectId as Id<'projects'>}
            onSuccess={() => setShowCreateModal(false)}
            onCancel={() => setShowCreateModal(false)}
          />
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={!!selectedFact} onOpenChange={(open) => !open && setSelectedFact(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Fact Details</SheetTitle>
            <SheetDescription>View and manage this fact</SheetDescription>
          </SheetHeader>

          {selectedFact && (
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm leading-relaxed">
                  <span className="text-foreground bg-secondary/50 rounded-md px-2 py-1 font-serif font-medium">
                    {selectedFact.subject}
                  </span>
                  <ArrowRight className="text-muted-foreground/70 size-4" />
                  <span className="text-predicate italic">
                    {selectedFact.predicate.replace(/_/g, ' ')}
                  </span>
                  <ArrowRight className="text-muted-foreground/70 size-4" />
                  <span className="text-foreground bg-secondary/50 rounded-md px-2 py-1 font-serif font-medium">
                    {selectedFact.object}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    'border-transparent ring-1',
                    selectedFact.status === 'confirmed' ?
                      'bg-green-500/15 text-green-600 ring-green-500/20 dark:text-green-400'
                    : selectedFact.status === 'rejected' ?
                      'bg-red-500/15 text-red-600 ring-red-500/20 dark:text-red-400'
                    : 'bg-amber-500/15 text-amber-600 ring-amber-500/20 dark:text-amber-400'
                  )}
                >
                  {selectedFact.status}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    'border-transparent ring-1',
                    selectedFact.confidence >= 0.9 ?
                      'bg-green-500/15 text-green-600 ring-green-500/20 dark:text-green-400'
                    : selectedFact.confidence >= 0.7 ?
                      'bg-amber-500/15 text-amber-600 ring-amber-500/20 dark:text-amber-400'
                    : 'bg-red-500/15 text-red-600 ring-red-500/20 dark:text-red-400'
                  )}
                >
                  {Math.round(selectedFact.confidence * 100)}% confidence
                </Badge>
              </div>

              {selectedFact.evidenceSnippet && (
                <div className="border-border/50 bg-muted/30 relative rounded-lg border p-4 pl-10">
                  <Quote className="text-muted-foreground/50 absolute top-4 left-3 size-4" />
                  <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                    "{selectedFact.evidenceSnippet}"
                  </p>
                </div>
              )}
            </div>
          )}

          <SheetFooter>
            {selectedFact && !selectedFact.documentId && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="mr-2 size-4" />
                Delete Fact
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fact</AlertDialogTitle>
            <AlertDialogDescription>
              Deleting this fact may cause continuity inconsistencies in your canon. You can restore
              consistency by running a new extraction on your documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (selectedFact) {
                  await deleteFact({ id: selectedFact._id });
                  setSelectedFact(null);
                  setShowDeleteConfirm(false);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
