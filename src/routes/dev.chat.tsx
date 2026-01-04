import {createFileRoute} from '@tanstack/react-router';
import {useState, useRef, useEffect} from 'react';
import {useMutation} from 'convex/react';
import {useStream} from '@convex-dev/persistent-text-streaming/react';
import type {StreamId} from '@convex-dev/persistent-text-streaming';
import {marked} from 'marked';
import {api} from '../../convex/_generated/api';

function MarkdownContent({children}: {children: string}) {
  const html = marked.parse(children, {async: false});
  return <span dangerouslySetInnerHTML={{__html: html}} />;
}
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Card} from '@/components/ui/card';
import {cn} from '@/lib/utils';
import {Send, User, Loader2} from 'lucide-react';
import {env} from '@/env';

function MothIcon({className}: {className?: string}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3c-1.5 2-3 4-3 6s1.5 3 3 3 3-1 3-3-1.5-4-3-6z" />
      <path d="M12 12v9" />
      <path d="M9 18c-3-1-5-4-5-7 0-2 1-4 3-5" />
      <path d="M15 18c3-1 5-4 5-7 0-2-1-4-3-5" />
      <circle cx="10" cy="7" r="1" />
      <circle cx="14" cy="7" r="1" />
    </svg>
  );
}

export const Route = createFileRoute('/dev/chat')({
  component: DevChat,
});

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  streamId?: string;
};

function StreamingMessage({streamId}: {streamId: string}) {
  const convexSiteUrl = env.VITE_CONVEX_URL.replace('.convex.cloud', '.convex.site');
  const streamUrl = new URL(`${convexSiteUrl}/chat-stream`);

  const {text, status} = useStream(api.chat.getStreamBody, streamUrl, false, streamId as StreamId);

  if (status === 'pending' || (!text && status === 'streaming')) {
    return (
      <div className="flex gap-1.5">
        <div
          className="bg-muted-foreground/60 h-2 w-2 animate-bounce rounded-full"
          style={{animationDelay: '0ms'}}
        />
        <div
          className="bg-muted-foreground/60 h-2 w-2 animate-bounce rounded-full"
          style={{animationDelay: '150ms'}}
        />
        <div
          className="bg-muted-foreground/60 h-2 w-2 animate-bounce rounded-full"
          style={{animationDelay: '300ms'}}
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

function DevChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

    const userMessage: Message = {role: 'user', content: inputValue.trim()};
    const newMessages: Message[] = [...messages, userMessage];

    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const cleanMessages = newMessages.map(({role, content}) => ({role, content}));

      const {streamId, messages: chatMessages} = await createStreamingChat({
        messages: cleanMessages,
      });

      setCurrentStreamId(streamId);
      setMessages([...newMessages, {role: 'assistant', content: '', streamId}]);

      const response = await fetch(`${convexSiteUrl}/chat-stream`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({streamId, messages: chatMessages}),
      });

      if (!response.ok) {
        throw new Error(`Stream failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const {done} = await reader.read();
          if (done) break;
        }
      }

      setCurrentStreamId(null);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages([
        ...newMessages,
        {role: 'assistant', content: 'Error: Failed to get response from Vellum.'},
      ]);
      setCurrentStreamId(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col p-4">
      <Card className="border-border/50 bg-background/95 supports-[backdrop-filter]:bg-background/60 flex flex-1 flex-col overflow-hidden shadow-xl backdrop-blur">
        <div className="bg-muted/50 flex items-center gap-2 border-b p-4">
          <MothIcon className="text-primary h-5 w-5" />
          <h1 className="font-serif text-lg font-semibold">Vellum Dev Chat</h1>
          <span className="bg-primary/10 text-primary rounded px-2 py-0.5 text-xs">Streaming</span>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="text-muted-foreground py-20 text-center">
              <p className="mb-2 font-serif text-lg">The archives are open.</p>
              <p className="text-sm">Ask Vellum anything to test the persona.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex max-w-[80%] gap-3',
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  msg.role === 'user' ?
                    'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
                )}
              >
                {msg.role === 'user' ?
                  <User className="h-4 w-4" />
                : <MothIcon className="h-4 w-4" />}
              </div>
              <div
                className={cn(
                  'rounded-lg p-3 text-sm leading-relaxed',
                  msg.role === 'user' ?
                    'bg-primary/10 text-foreground'
                  : 'bg-muted/50 text-muted-foreground border-border/50 prose prose-sm dark:prose-invert max-w-none border'
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

          {isLoading && !currentStreamId && (
            <div className="mr-auto flex max-w-[80%] gap-3">
              <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                <MothIcon className="text-muted-foreground h-4 w-4" />
              </div>
              <div className="bg-muted/20 border-border/20 flex h-10 items-center rounded-lg border px-4 py-3">
                <div className="flex gap-1.5">
                  <div
                    className="bg-muted-foreground/60 h-2 w-2 animate-bounce rounded-full"
                    style={{animationDelay: '0ms'}}
                  />
                  <div
                    className="bg-muted-foreground/60 h-2 w-2 animate-bounce rounded-full"
                    style={{animationDelay: '150ms'}}
                  />
                  <div
                    className="bg-muted-foreground/60 h-2 w-2 animate-bounce rounded-full"
                    style={{animationDelay: '300ms'}}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-background border-t p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Message Vellum..."
              className="flex-1 font-mono text-sm"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading || !inputValue.trim()}>
              {isLoading ?
                <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
