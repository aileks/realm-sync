import { Link } from '@tanstack/react-router';
import {
  FileText,
  Users,
  Lightbulb,
  AlertTriangle,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Doc } from '../../convex/_generated/dataModel';

type Project = Doc<'projects'>;

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const stats = project.stats ?? {
    documentCount: 0,
    entityCount: 0,
    factCount: 0,
    alertCount: 0,
  };

  return (
    <Link to="/projects/$projectId" params={{ projectId: project._id }} className="block">
      <Card className="group hover:ring-primary/20 transition-all duration-200 hover:ring-2">
        <CardHeader>
          <CardTitle className="group-hover:text-primary font-serif text-lg transition-colors">
            {project.name}
          </CardTitle>
          {project.description && (
            <CardDescription className="line-clamp-2">{project.description}</CardDescription>
          )}
          <CardAction>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="hover:bg-muted rounded-lg p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => e.preventDefault()}
              >
                <MoreVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    onEdit?.(project);
                  }}
                >
                  <Pencil className="mr-2 size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete?.(project);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <StatBadge icon={FileText} count={stats.documentCount} label="docs" />
            <StatBadge
              icon={Users}
              count={stats.entityCount}
              label="entities"
              variant="entity-character"
            />
            <StatBadge
              icon={Lightbulb}
              count={stats.factCount}
              label="facts"
              variant="entity-concept"
            />
            {stats.alertCount > 0 && (
              <StatBadge
                icon={AlertTriangle}
                count={stats.alertCount}
                label="alerts"
                variant="destructive"
              />
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

interface StatBadgeProps {
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  label: string;
  variant?: 'default' | 'destructive' | 'entity-character' | 'entity-concept';
}

function StatBadge({ icon: Icon, count, label, variant = 'default' }: StatBadgeProps) {
  return (
    <Badge
      variant={variant === 'destructive' ? 'destructive' : 'secondary'}
      className={cn(
        'gap-1',
        variant === 'entity-character' && 'bg-entity-character/10 text-entity-character',
        variant === 'entity-concept' && 'bg-entity-concept/10 text-entity-concept'
      )}
    >
      <Icon className="size-3" />
      <span>{count}</span>
      <span>{label}</span>
    </Badge>
  );
}
