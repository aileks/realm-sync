import { useState } from 'react';
import { useAction } from 'convex/react';
import { Download, FileJson, FileText, Table } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ExportFormat = 'json' | 'markdown' | 'csv';

type ExportButtonProps = {
  projectId: Id<'projects'>;
  projectName: string;
  className?: string;
};

export function ExportButton({ projectId, projectName, className }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const exportProject = useAction(api.export.exportProject);

  async function handleExport(format: ExportFormat) {
    setIsExporting(true);
    try {
      const content = await exportProject({ projectId, format });
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
    } catch (error) {
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), className)}
        disabled={isExporting}
      >
        <Download className="size-4" />
        {isExporting ? 'Exporting...' : 'Export'}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Export Format</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => handleExport('json')}>
            <FileJson className="mr-2 size-4" />
            JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport('markdown')}>
            <FileText className="mr-2 size-4" />
            Markdown
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport('csv')}>
            <Table className="mr-2 size-4" />
            CSV
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
