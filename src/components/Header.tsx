import { Link } from '@tanstack/react-router';

import { useState } from 'react';
import { BookOpen, Home, Menu, Palette, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const navLinkBase = 'flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors mb-2';
const navLinkActive =
  'flex items-center gap-3 p-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mb-2';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <header className="bg-card text-foreground flex items-center p-4 shadow-lg">
        <button
          onClick={() => setIsOpen(true)}
          className="hover:bg-muted rounded-lg p-2 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
        <h1 className="ml-4 font-serif text-xl font-semibold">
          <Link to="/" className="text-primary hover:text-primary/80 transition-colors">
            Realm Sync
          </Link>
        </h1>
      </header>

      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setIsOpen(false)}
      />

      <aside
        className={cn(
          'bg-background text-foreground fixed top-0 left-0 z-50 flex h-full w-80 transform flex-col shadow-2xl transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="border-border flex items-center justify-between border-b p-4">
          <h2 className="font-serif text-xl font-bold">Navigation</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-muted rounded-lg p-2 transition-colors"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className={navLinkBase}
            activeProps={{ className: navLinkActive }}
          >
            <Home size={20} />
            <span className="font-medium">Home</span>
          </Link>

          <Link
            to="/demo/theme"
            onClick={() => setIsOpen(false)}
            className={navLinkBase}
            activeProps={{ className: navLinkActive }}
          >
            <Palette size={20} />
            <span className="font-medium">Theme Showcase</span>
          </Link>

          <div className="border-border my-4 border-t" />

          <p className="text-muted-foreground mb-2 px-3 font-mono text-xs tracking-widest uppercase">
            Coming Soon
          </p>

          <div className="text-muted-foreground/50 flex cursor-not-allowed items-center gap-3 p-3">
            <BookOpen size={20} />
            <span className="font-medium">Projects</span>
          </div>
        </nav>

        <div className="border-border bg-card/50 border-t p-4">
          <p className="text-muted-foreground font-mono text-xs">🦋 Vellum guides the archive</p>
        </div>
      </aside>
    </>
  );
}
