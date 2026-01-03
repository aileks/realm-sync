import type { FormEvent } from 'react';
import { useState, useRef } from 'react';
import { useMutation } from 'convex/react';
import { Loader2, Upload, FileText, Type } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Doc, Id } from '../../convex/_generated/dataModel';

type Document = Doc<'documents'>;
type ContentType = 'text' | 'markdown' | 'file';

interface DocumentFormProps {
  projectId: Id<'projects'>;
  document?: Document;
  onSuccess?: (documentId: Id<'documents'>) => void;
  onCancel?: () => void;
}

export function DocumentForm({ projectId, document, onSuccess, onCancel }: DocumentFormProps) {
  const [title, setTitle] = useState(document?.title ?? '');
  const [content, setContent] = useState(document?.content ?? '');
  const [contentType, setContentType] = useState<ContentType>(document?.contentType ?? 'text');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const createDocument = useMutation(api.documents.create);
  const updateDocument = useMutation(api.documents.update);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const isEditing = !!document;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let storageId: Id<'_storage'> | undefined;
      let finalContent = content;

      if (contentType === 'file' && selectedFile) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': selectedFile.type },
          body: selectedFile,
        });
        const { storageId: uploadedId } = await result.json();
        storageId = uploadedId;

        if (
          selectedFile.type.startsWith('text/') ||
          selectedFile.name.endsWith('.md') ||
          selectedFile.name.endsWith('.txt')
        ) {
          finalContent = await selectedFile.text();
        }
      }

      if (isEditing) {
        await updateDocument({
          id: document._id,
          title: title.trim(),
          content: finalContent || undefined,
          storageId,
          contentType,
        });
        onSuccess?.(document._id);
      } else {
        const docId = await createDocument({
          projectId,
          title: title.trim(),
          content: finalContent || undefined,
          storageId,
          contentType,
        });
        onSuccess?.(docId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save document');
    } finally {
      setIsLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  }

  const tabs: {
    id: ContentType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'text', label: 'Paste Text', icon: Type },
    { id: 'markdown', label: 'Markdown', icon: FileText },
    { id: 'file', label: 'Upload File', icon: Upload },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">{error}</div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Document Title</Label>
        <Input
          id="title"
          placeholder="Enter document title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      {!isEditing && (
        <div className="space-y-3">
          <Label>Content Type</Label>
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setContentType(tab.id)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  contentType === tab.id ?
                    'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
                disabled={isLoading}
              >
                <tab.icon className="size-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {contentType === 'file' ?
        <div className="space-y-2">
          <Label>Upload File</Label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-border hover:border-primary/50 flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
              selectedFile && 'border-primary bg-primary/5'
            )}
          >
            <Upload className="text-muted-foreground mb-2 size-8" />
            {selectedFile ?
              <p className="text-sm font-medium">{selectedFile.name}</p>
            : <>
                <p className="text-sm font-medium">Click to upload or drag and drop</p>
                <p className="text-muted-foreground text-xs">TXT, MD, or other text files</p>
              </>
            }
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.markdown,text/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      : <div className="space-y-2">
          <Label htmlFor="content">
            {contentType === 'markdown' ? 'Markdown Content' : 'Text Content'}
          </Label>
          <Textarea
            id="content"
            placeholder={
              contentType === 'markdown' ?
                '# Chapter 1\n\nStart writing your story...'
              : 'Paste or type your content here...'
            }
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            disabled={isLoading}
            className="font-mono"
          />
        </div>
      }

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading || !title.trim()}>
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {isEditing ? 'Save Changes' : 'Create Document'}
        </Button>
      </div>
    </form>
  );
}
