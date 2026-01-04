import { createFileRoute } from '@tanstack/react-router';
import { useState, useRef, useEffect } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Send, Bot, User, Loader2 } from 'lucide-react';

export const Route = createFileRoute('/dev/chat')({
  component: DevChat,
});

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

function DevChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendMessage = useAction((api as any).chat?.sendMessage);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: inputValue.trim() }];

    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (sendMessage as any)({ messages: newMessages });
      setMessages([...newMessages, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Error: Failed to get response from Vellum.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col p-4">
      <Card className="border-border/50 bg-background/95 supports-[backdrop-filter]:bg-background/60 flex flex-1 flex-col overflow-hidden shadow-xl backdrop-blur">
        <div className="bg-muted/50 flex items-center gap-2 border-b p-4">
          <Bot className="text-primary h-5 w-5" />
          <h1 className="font-serif text-lg font-semibold">Vellum Dev Chat</h1>
          <div className="text-muted-foreground ml-auto font-mono text-xs">
            {process.env.NODE_ENV}
          </div>
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
                : <Bot className="h-4 w-4" />}
              </div>
              <div
                className={cn(
                  'rounded-lg p-3 text-sm leading-relaxed',
                  msg.role === 'user' ?
                    'bg-primary/10 text-foreground'
                  : 'bg-muted/50 text-muted-foreground border-border/50 border'
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="mr-auto flex max-w-[80%] animate-pulse gap-3">
              <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                <Bot className="text-muted-foreground h-4 w-4" />
              </div>
              <div className="bg-muted/20 border-border/20 flex h-10 w-24 items-center rounded-lg border p-3">
                <div className="flex gap-1">
                  <div className="bg-muted-foreground/40 h-2 w-2 animate-bounce rounded-full delay-0"></div>
                  <div className="bg-muted-foreground/40 h-2 w-2 animate-bounce rounded-full delay-150"></div>
                  <div className="bg-muted-foreground/40 h-2 w-2 animate-bounce rounded-full delay-300"></div>
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
