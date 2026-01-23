import { useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { Download, FileJson, FileText, Table } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';

type ExportFormat = 'json' | 'markdown' | 'csv';
type ExportScope = 'all' | 'revealed';

const FORMAT_OPTIONS: Array<{ value: ExportFormat; label: string; icon: typeof FileJson }> = [
  { value: 'json', label: 'JSON', icon: FileJson },
  { value: 'markdown', label: 'Markdown', icon: FileText },
  { value: 'csv', label: 'CSV', icon: Table },
];

const SCOPE_OPTIONS: Array<{ value: ExportScope; label: string }> = [
  { value: 'all', label: 'All Info' },
  { value: 'revealed', label: 'Player Safe' },
];

type ExportButtonProps = {
  projectId: Id<'projects'>;
  projectName: string;
  className?: string;
};

export function ExportButton({ projectId, projectName, className }: ExportButtonProps) {
  const project = useQuery(api.projects.get, { id: projectId });
  const isTtrpgProject = project?.projectType === 'ttrpg';
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('json');
  const [scope, setScope] = useState<ExportScope>('all');
  const exportProject = useAction(api.export.exportProject);

  async function handleExport() {
    setIsExporting(true);
    try {
      const includeUnrevealed = !isTtrpgProject || scope === 'all';
      const content = await exportProject({ projectId, format, includeUnrevealed });
      if (!content) {
        toast.error('Export failed', { description: 'Could not generate export data.' });
        return;
      }

      const safeName = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'project';
      const date = new Date().toISOString().split('T')[0];
      const ext = format === 'markdown' ? 'md' : format;
      const filename = `${safeName}-export-${date}.${ext}`;

      const mimeTypes: Record<ExportFormat, string> = {
        json: 'application/json',
        markdown: 'text/markdown',
        csv: 'text/csv',
      };

      const blob = new Blob([content], { type: mimeTypes[format] });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Export complete', { description: `Downloaded ${filename}` });
      setIsOpen(false);
    } catch (error) {
      toast.error('Export failed', {
        description: getErrorMessage(error),
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), className)}
        disabled={isExporting}
      >
        <Download className="size-4" />
        {isExporting ? 'Exporting...' : 'Export'}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Project</DialogTitle>
          <DialogDescription>Choose your export format and visibility.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="exportFormat">Format</Label>
            <Select value={format} onValueChange={(val) => setFormat(val as ExportFormat)}>
              <SelectTrigger id="exportFormat" className="w-full">
                <SelectValue>
                  {(value) =>
                    FORMAT_OPTIONS.find((option) => option.value === value)?.label ??
                    'Select format'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent side="bottom" align="start" sideOffset={4}>
                {FORMAT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        <Icon className="size-4" />
                        {option.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          {isTtrpgProject && (
            <div className="space-y-2">
              <Label htmlFor="exportScope">Visibility</Label>
              <Select value={scope} onValueChange={(val) => setScope(val as ExportScope)}>
                <SelectTrigger id="exportScope" className="w-full">
                  <SelectValue>
                    {(value) =>
                      SCOPE_OPTIONS.find((option) => option.value === value)?.label ?? 'All Info'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent side="bottom" align="start" sideOffset={4}>
                  {SCOPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Revealed only exports player-safe content.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <button
            type="button"
            className={cn(buttonVariants({ variant: 'outline' }))}
            onClick={() => setIsOpen(false)}
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={cn(buttonVariants({ variant: 'default' }))}
            onClick={() => void handleExport()}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
