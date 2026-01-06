import type { FormEvent } from 'react';
import { useState } from 'react';
import { useMutation } from 'convex/react';
import { Loader2 } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
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

type EntityType = 'character' | 'location' | 'item' | 'concept' | 'event';

const ENTITY_TYPES: { value: EntityType; label: string }[] = [
  { value: 'character', label: 'Character' },
  { value: 'location', label: 'Location' },
  { value: 'item', label: 'Item' },
  { value: 'concept', label: 'Concept' },
  { value: 'event', label: 'Event' },
];

type EntityFormProps = {
  projectId: Id<'projects'>;
  onSuccess?: (entityId: Id<'entities'>) => void;
  onCancel?: () => void;
};

export function EntityForm({ projectId, onSuccess, onCancel }: EntityFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<EntityType>('character');
  const [description, setDescription] = useState('');
  const [aliases, setAliases] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEntity = useMutation(api.entities.create);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const aliasArray = aliases
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      const entityId = await createEntity({
        projectId,
        name: name.trim(),
        type,
        description: description.trim() || undefined,
        aliases: aliasArray.length > 0 ? aliasArray : undefined,
        status: 'confirmed',
      });
      onSuccess?.(entityId);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">{error}</div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          placeholder="Entity name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <Select
          value={type}
          onValueChange={(val) => setType(val as EntityType)}
          disabled={isLoading}
        >
          <SelectTrigger id="type">
            <SelectValue>Select type</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          placeholder="Brief description of this entity"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="aliases">Aliases (optional)</Label>
        <Input
          id="aliases"
          placeholder="Comma-separated aliases (e.g., Nick, Nicholas)"
          value={aliases}
          onChange={(e) => setAliases(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading || !name.trim()}>
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          Create Entity
        </Button>
      </div>
    </form>
  );
}
