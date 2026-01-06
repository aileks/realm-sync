import type { FormEvent } from 'react';
import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Loader2 } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id, Doc } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatError } from '@/lib/utils';

type FactFormProps = {
  projectId: Id<'projects'>;
  onSuccess?: (factId: Id<'facts'>) => void;
  onCancel?: () => void;
};

export function FactForm({ projectId, onSuccess, onCancel }: FactFormProps) {
  const [subject, setSubject] = useState('');
  const [predicate, setPredicate] = useState('');
  const [object, setObject] = useState('');
  const [entityId, setEntityId] = useState<string | undefined>(undefined);
  const [documentId, setDocumentId] = useState<string | undefined>(undefined);
  const [evidenceSnippet, setEvidenceSnippet] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createFact = useMutation(api.facts.create);
  const entities = useQuery(api.entities.listByProject, { projectId });
  const documents = useQuery(api.documents.list, { projectId });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const factId = await createFact({
        projectId,
        subject: subject.trim(),
        predicate: predicate.trim(),
        object: object.trim(),
        confidence: 1.0,
        status: 'confirmed',
        entityId: entityId ? (entityId as Id<'entities'>) : undefined,
        documentId: documentId ? (documentId as Id<'documents'>) : undefined,
        evidenceSnippet: evidenceSnippet.trim() || undefined,
      });
      onSuccess?.(factId);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setIsLoading(false);
    }
  }

  const isValid = subject.trim() && predicate.trim() && object.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">{error}</div>
      )}

      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          placeholder="Who or what the fact is about"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="predicate">Predicate</Label>
        <Input
          id="predicate"
          placeholder="The relationship or property (e.g., 'is located in', 'has ability')"
          value={predicate}
          onChange={(e) => setPredicate(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="object">Object</Label>
        <Input
          id="object"
          placeholder="The value or target of the relationship"
          value={object}
          onChange={(e) => setObject(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="entity">Link to Entity (optional)</Label>
        <Select
          value={entityId}
          onValueChange={(val) => setEntityId(val ?? undefined)}
          disabled={isLoading}
        >
          <SelectTrigger id="entity">
            <SelectValue>{entityId ? 'Selected' : 'Select an entity'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {entities?.map((entity: Doc<'entities'>) => (
              <SelectItem key={entity._id} value={entity._id}>
                {entity.name} ({entity.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="document">Link to Document (optional)</Label>
        <Select
          value={documentId}
          onValueChange={(val) => setDocumentId(val ?? undefined)}
          disabled={isLoading}
        >
          <SelectTrigger id="document">
            <SelectValue>{documentId ? 'Selected' : 'Select a document'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {documents?.map((doc: Doc<'documents'>) => (
              <SelectItem key={doc._id} value={doc._id}>
                {doc.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="evidenceSnippet">Evidence Snippet (optional)</Label>
        <Textarea
          id="evidenceSnippet"
          placeholder="Quote or reference supporting this fact"
          value={evidenceSnippet}
          onChange={(e) => setEvidenceSnippet(e.target.value)}
          rows={3}
          disabled={isLoading}
        />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading || !isValid}>
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          Create Fact
        </Button>
      </div>
    </form>
  );
}
