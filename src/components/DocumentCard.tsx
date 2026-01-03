import {
  FileText,
  FileCode,
  File,
  MoreVertical,
  Pencil,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Doc } from '../../convex/_generated/dataModel';

type Document = Doc<'documents'>;

interface DocumentCardProps {
  document: Document;
  onClick?: () => void;
  onEdit?: (document: Document) => void;
  onDelete?: (document: Document) => void;
}

const contentTypeIcons = {
  text: FileText,
  markdown: FileCode,
  file: File,
};

const statusConfig = {
  pending: { icon: Clock, className: 'text-muted-foreground' },
  processing: { icon: Loader2, className: 'text-primary animate-spin' },
  completed: { icon: CheckCircle, className: 'text-green-500' },
  failed: { icon: AlertCircle, className: 'text-destructive' },
};

export function DocumentCard({ document, onClick, onEdit, onDelete }: DocumentCardProps) {
  const ContentTypeIcon = contentTypeIcons[document.contentType];
  const status = statusConfig[document.processingStatus];
  const StatusIcon = status.icon;

  return (
    <Card
      className={cn(
        'group transition-all duration-200',
        onClick && 'hover:ring-primary/20 cursor-pointer hover:ring-2'
      )}
      onClick={onClick}
    >
      <CardHeader className="py-4">
        <div className="flex items-center gap-3">
          <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
            <ContentTypeIcon className="text-muted-foreground size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base font-medium">{document.title}</CardTitle>
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="text-xs">
                {document.contentType}
              </Badge>
              <span>{document.wordCount.toLocaleString()} words</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon className={cn('size-4', status.className)} />
            <CardAction>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="hover:bg-muted rounded-lg p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit?.(document)}>
                    <Pencil className="mr-2 size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => onDelete?.(document)}>
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardAction>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
