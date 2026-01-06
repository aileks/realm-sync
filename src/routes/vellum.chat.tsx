import { createFileRoute } from '@tanstack/react-router';
import { VellumChat } from '@/components/VellumChat';
import { MothIcon } from '@/components/ui/moth-icon';

export const Route = createFileRoute('/vellum/chat')({
  component: VellumChatPage,
});

function VellumChatPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="bg-muted/30 flex items-center gap-3 border-b px-6 py-4">
        <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/30 ring-1 ring-amber-500/30">
          <MothIcon className="size-6" />
        </div>
        <div>
          <h1 className="font-serif text-lg font-semibold">Vellum</h1>
          <p className="text-muted-foreground text-xs">Your Archive Assistant</p>
        </div>
      </div>
      <VellumChat />
    </div>
  );
}
