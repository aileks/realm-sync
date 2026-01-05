import { useState, useRef, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { useStream } from '@convex-dev/persistent-text-streaming/react';
import type { StreamId } from '@convex-dev/persistent-text-streaming';
import { marked } from 'marked';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Send, User, Loader2, AlertCircle } from 'lucide-react';
import { env } from '@/env';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  streamId?: string;
};

function MarkdownContent({ children }: { children: string }) {
  const html = marked.parse(children, { async: false });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function MothIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn('text-amber-400', className)}>
      <g className="origin-center">
        <path
          d="M12 4C10 4 8.5 6 8 8C7 9.5 4 10 3 12C4 14 7 14.5 8 16C8.5 18 10 20 12 20C14 20 15.5 18 16 16C17 14.5 20 14 21 12C20 10 17 9.5 16 8C15.5 6 14 4 12 4Z"
          fill="currentColor"
          fillOpacity="0.3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 6C11 6 10 7.5 9.5 9C9 10 7 10.5 6 12C7 13.5 9 14 9.5 15C10 16.5 11 18 12 18C13 18 14 16.5 14.5 15C15 14 17 13.5 18 12C17 10.5 15 10 14.5 9C14 7.5 13 6 12 6Z"
          fill="currentColor"
          fillOpacity="0.5"
        />
        <circle cx="10" cy="11" r="1" fill="currentColor" />
        <circle cx="14" cy="11" r="1" fill="currentColor" />
        <path d="M10 7C9 5 8 4 7 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <path
          d="M14 7C15 5 16 4 17 3"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <ellipse cx="12" cy="12" rx="2" ry="4" fill="currentColor" fillOpacity="0.7" />
      </g>
    </svg>
  );
}

function StreamingMessage({ streamId }: { streamId: string }) {
  const convexSiteUrl = env.VITE_CONVEX_URL.replace('.convex.cloud', '.convex.site');
  const streamUrl = new URL(`${convexSiteUrl}/chat-stream`);

  const { text, status } = useStream(
    api.chat.getStreamBody,
    streamUrl,
    false,
    streamId as StreamId
  );

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);

  const createStreamingChat = useMutation(api.chat.createStreamingChat);
  const scrollRef = useRef<HTMLDivElement>(null);

  const convexSiteUrl = env.VITE_CONVEX_URL.replace('.convex.cloud', '.convex.site');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, currentStreamId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    setError(null);
    const userMessage: Message = { role: 'user', content: inputValue.trim() };
    const newMessages: Message[] = [...messages, userMessage];

    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const cleanMessages = newMessages.map(({ role, content }) => ({ role, content }));

      const { streamId, messages: chatMessages } = await createStreamingChat({
        messages: cleanMessages,
      });

      setCurrentStreamId(streamId);
      setMessages([...newMessages, { role: 'assistant', content: '', streamId }]);

      const response = await fetch(`${convexSiteUrl}/chat-stream`, {
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

      setCurrentStreamId(null);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to get response. Please try again.');
      setMessages(newMessages);
      setCurrentStreamId(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="text-muted-foreground py-8 text-center">
            <p className="mb-1 font-serif text-sm">The archives are open.</p>
            <p className="text-xs">Ask me anything about your world.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
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
                <StreamingMessage streamId={msg.streamId} />
              : <MarkdownContent>{msg.content}</MarkdownContent>}
            </div>
          </div>
        ))}

        {isLoading && !currentStreamId && <ThinkingIndicator />}
      </div>

      {error && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
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

      <div className="border-t p-3">
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
        </form>
      </div>
    </div>
  );
}
