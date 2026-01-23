import type { FormEvent } from 'react';
import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Loader2 } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import { getErrorMessage } from '@/lib/errors';

type Project = Doc<'projects'>;

type ProjectType = 'ttrpg' | 'original-fiction' | 'fanfiction' | 'game-design' | 'general';

const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  ttrpg: 'TTRPG Campaign',
  'original-fiction': 'Original Fiction',
  fanfiction: 'Fanfiction',
  'game-design': 'Game Design',
  general: 'General Worldbuilding',
};

const PLAYER_REVEAL_OPTIONS = [
  {
    value: 'enabled',
    label: 'Reveal info to players',
  },
  {
    value: 'disabled',
    label: 'Keep info hidden from players',
  },
] as const;

type ProjectFormProps = {
  project?: Project;
  onSuccess?: (projectId: Id<'projects'>) => void;
  onCancel?: () => void;
};

export function ProjectForm({ project, onSuccess, onCancel }: ProjectFormProps) {
  const user = useQuery(api.users.viewer);
  const [name, setName] = useState(project?.name ?? '');
  const [projectType, setProjectType] = useState<ProjectType>(() => {
    const currentType = project?.projectType as ProjectType;
    const validTypes: ProjectType[] = [
      'ttrpg',
      'original-fiction',
      'fanfiction',
      'game-design',
      'general',
    ];
    return currentType && validTypes.includes(currentType) ? currentType : 'general';
  });
  const [revealToPlayersEnabled, setRevealToPlayersEnabled] = useState(
    project?.revealToPlayersEnabled ?? true
  );
  const [description, setDescription] = useState(project?.description ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);

  const isEditing = !!project;

  // Filter types based on user's onboarding preferences; general always available
  const userModes = user?.settings?.projectModes as ProjectType[] | undefined;
  const availableTypes: ProjectType[] =
    userModes && userModes.length > 0 ?
      ([...new Set([...userModes, 'general' as const])] as ProjectType[])
    : ['ttrpg', 'original-fiction', 'fanfiction', 'game-design', 'general'];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isEditing) {
        await updateProject({
          id: project._id,
          name: name.trim(),
          description: description.trim() || undefined,
          projectType,
        });
        onSuccess?.(project._id);
      } else {
        const projectId = await createProject({
          name: name.trim(),
          description: description.trim() || undefined,
          projectType,
          ...(projectType === 'ttrpg' && { revealToPlayersEnabled }),
        });
        onSuccess?.(projectId);
      }
    } catch (err) {
      setError(getErrorMessage(err));
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
        <Label htmlFor="name">Project Name</Label>
        <Input
          id="name"
          placeholder="Enter project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="projectType">Project Type</Label>
        <Select
          value={projectType}
          onValueChange={(val) => setProjectType(val as ProjectType)}
          disabled={isLoading}
        >
          <SelectTrigger id="projectType" className="w-full">
            <SelectValue>
              {(value) =>
                value && typeof value === 'string' ?
                  (PROJECT_TYPE_LABELS[value as ProjectType] ?? value)
                : 'Select project type'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent side="bottom" align="start" sideOffset={4} alignItemWithTrigger={false}>
            {availableTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {PROJECT_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!isEditing && projectType === 'ttrpg' && (
        <div className="space-y-2">
          <Label htmlFor="playerRevealMode">Player Reveal</Label>
          <Select
            value={revealToPlayersEnabled ? 'enabled' : 'disabled'}
            onValueChange={(val) => setRevealToPlayersEnabled(val === 'enabled')}
            disabled={isLoading}
          >
            <SelectTrigger id="playerRevealMode" className="w-full">
              <SelectValue>
                {(value) =>
                  value === 'enabled' ? 'Reveal info to players' : 'Keep info hidden from players'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent side="bottom" align="start" sideOffset={4} alignItemWithTrigger={false}>
              {PLAYER_REVEAL_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          placeholder="Brief description of your world or campaign"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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
        <Button type="submit" disabled={isLoading || !name.trim()}>
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {isEditing ? 'Save Changes' : 'Create Project'}
        </Button>
      </div>
    </form>
  );
}
