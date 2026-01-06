import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useStream } from '@convex-dev/persistent-text-streaming/react';
import type { StreamId } from '@convex-dev/persistent-text-streaming';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MothIcon } from '@/components/ui/moth-icon';
import { cn } from '@/lib/utils';
import { Send, User, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { env } from '@/env';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streamId?: string;
};

const CONVEX_SITE_URL = env.VITE_CONVEX_URL.replace('.convex.cloud', '.convex.site');

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function MarkdownContent({ children }: { children: string }) {
  const rawHtml = marked.parse(children, { async: false });
  const sanitizedHtml = DOMPurify.sanitize(rawHtml);
  return <span dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}

type StreamingMessageProps = {
  streamId: string;
  siteUrl: string;
  onComplete?: (content: string) => void;
};

function StreamingMessage({ streamId, siteUrl, onComplete }: StreamingMessageProps) {
  const streamUrl = new URL(`${siteUrl}/chat-stream`);
  const hasCalledComplete = useRef(false);

  const { text, status } = useStream(
    api.chat.getStreamBody,
    streamUrl,
    false,
    streamId as StreamId
  );

  useEffect(() => {
    if (status === 'done' && text && onComplete && !hasCalledComplete.current) {
      hasCalledComplete.current = true;
      onComplete(text);
    }
  }, [status, text, onComplete]);

  if (status === 'pending' || (!text && status === 'streaming')) {
    return (
      <div className="flex gap-1.5">
        <div
          className="bg-muted-foreground/60 h-2 w-2 animate-bounce rounded-full"
          style={{ animationDelay: '0ms' }}
        />
        <div
          className="bg-muted-foreground/60 h-2 w-2 animate-bounce rounded-full"
          style={{ animationDelay: '150ms' }}
        />
        <div
          className="bg-muted-foreground/60 h-2 w-2 animate-bounce rounded-full"
          style={{ animationDelay: '300ms' }}
        />
      </div>
    );
  }

  return (
    <>
      <MarkdownContent>{text || '...'}</MarkdownContent>
      {status === 'streaming' && <span className="ml-1 inline-block animate-pulse">▋</span>}
    </>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-2">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/30">
        <MothIcon className="size-4" />
      </div>
      <div className="bg-muted/50 flex items-center rounded-2xl rounded-tl-sm px-3 py-2">
        <div className="flex gap-1.5">
          <div
            className="bg-muted-foreground/60 h-1.5 w-1.5 animate-bounce rounded-full"
            style={{ animationDelay: '0ms' }}
          />
          <div
            className="bg-muted-foreground/60 h-1.5 w-1.5 animate-bounce rounded-full"
            style={{ animationDelay: '150ms' }}
          />
          <div
            className="bg-muted-foreground/60 h-1.5 w-1.5 animate-bounce rounded-full"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
}

export function VellumChat() {
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const [pendingAssistantId, setPendingAssistantId] = useState<string | null>(null);

  const savedMessages = useQuery(api.chatHistory.list, { limit: 100 });
  const sendMessage = useMutation(api.chatHistory.send);
  const clearHistory = useMutation(api.chatHistory.clear);
  const createStreamingChat = useMutation(api.chat.createStreamingChat);
  const scrollRef = useRef<HTMLDivElement>(null);

  const dbMessages: Message[] =
    savedMessages?.map((m) => ({
      id: m._id,
      role: m.role,
      content: m.content,
    })) ?? [];

  const allMessages = [...dbMessages, ...localMessages];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [dbMessages.length, localMessages.length, isLoading, currentStreamId]);

  const handleStreamComplete = async (content: string) => {
    if (!pendingAssistantId) return;

    await sendMessage({ role: 'assistant', content });
    setLocalMessages((prev) => prev.filter((m) => m.id !== pendingAssistantId));
    setPendingAssistantId(null);
    setCurrentStreamId(null);
  };

  const handleClearHistory = async () => {
    await clearHistory({});
    setLocalMessages([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    setError(null);
    const userContent = inputValue.trim();
    const userMessageId = generateId();
    const userMessage: Message = { id: userMessageId, role: 'user', content: userContent };

    setLocalMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      await sendMessage({ role: 'user', content: userContent });
      setLocalMessages((prev) => prev.filter((m) => m.id !== userMessageId));

      const messagesForApi = [...dbMessages, { role: 'user' as const, content: userContent }].map(
        ({ role, content }) => ({ role, content })
      );

      const { streamId, messages: chatMessages } = await createStreamingChat({
        messages: messagesForApi,
      });

      const assistantId = generateId();
      const assistantMessage: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        streamId,
      };

      setPendingAssistantId(assistantId);
      setCurrentStreamId(streamId);
      setLocalMessages((prev) => [...prev, assistantMessage]);

      const response = await fetch(`${CONVEX_SITE_URL}/chat-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId, messages: chatMessages }),
      });

      if (!response.ok) {
        throw new Error(`Stream failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to get response. Please try again.');
      setLocalMessages((prev) =>
        prev.filter((msg) => !msg.streamId || msg.streamId !== currentStreamId)
      );
      setCurrentStreamId(null);
      setPendingAssistantId(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 px-6">
        {allMessages.length === 0 && (
          <div className="text-muted-foreground py-8 text-center">
            <p className="mb-1 font-serif text-sm">The archives are open.</p>
            <p className="text-xs">Ask me anything about your world.</p>
          </div>
        )}

        {allMessages.map((msg) => (
          <div
            key={msg.id}
            className={cn('flex items-start gap-2', msg.role === 'user' && 'flex-row-reverse')}
          >
            <div
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full',
                msg.role === 'user' ?
                  'bg-primary text-primary-foreground'
                : 'bg-gradient-to-br from-amber-500/20 to-amber-600/30'
              )}
            >
              {msg.role === 'user' ?
                <User className="size-3" />
              : <MothIcon className="size-4" />}
            </div>
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                msg.role === 'user' ?
                  'bg-primary/10 rounded-tr-sm'
                : 'prose prose-sm dark:prose-invert bg-muted/50 max-w-none rounded-tl-sm'
              )}
            >
              {msg.role === 'user' ?
                msg.content
              : msg.streamId ?
                <StreamingMessage
                  streamId={msg.streamId}
                  siteUrl={CONVEX_SITE_URL}
                  onComplete={handleStreamComplete}
                />
              : <MarkdownContent>{msg.content}</MarkdownContent>}
            </div>
          </div>
        ))}

        {isLoading && !currentStreamId && <ThinkingIndicator />}
      </div>

      {error && (
        <div className="mx-6 mb-2 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <AlertCircle className="size-3" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto hover:text-red-300"
            type="button"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="border-t px-6 py-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask Vellum..."
            className="flex-1 text-sm"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !inputValue.trim()}>
            {isLoading ?
              <Loader2 className="size-4 animate-spin" />
            : <Send className="size-4" />}
          </Button>
          {allMessages.length > 0 && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleClearHistory}
              disabled={isLoading}
              title="Clear chat history"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
