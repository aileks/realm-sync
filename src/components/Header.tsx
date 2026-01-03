import { Link, useNavigate } from '@tanstack/react-router';
import { useConvexAuth } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { useState } from 'react';
import { BookOpen, Home, Menu, FolderOpen, LogOut, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function Header() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const [isOpen, setIsOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate({ to: '/' });
  }

  return (
    <>
      <header className="bg-card text-foreground flex items-center justify-between p-4 shadow-lg">
        <div className="flex items-center">
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
        </div>

        <div className="flex items-center gap-2">
          {isLoading ?
            null
          : isAuthenticated ?
            <DropdownMenu>
              <DropdownMenuTrigger className="hover:bg-muted flex items-center gap-2 rounded-lg p-2 transition-colors">
                <User size={20} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate({ to: '/projects' })}>
                  <FolderOpen className="mr-2 size-4" />
                  Projects
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 size-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          : <Button size="sm" onClick={() => navigate({ to: '/auth' })}>
              Sign In
            </Button>
          }
        </div>
      </header>

      <div
        role="presentation"
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setIsOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setIsOpen(false);
        }}
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
          <NavLink to="/" icon={Home} onClick={() => setIsOpen(false)}>
            Home
          </NavLink>

          {isAuthenticated && (
            <NavLink to="/projects" icon={FolderOpen} onClick={() => setIsOpen(false)}>
              Projects
            </NavLink>
          )}

          <div className="border-border my-4 border-t" />

          <p className="text-muted-foreground mb-2 px-3 font-mono text-xs tracking-widest uppercase">
            Coming Soon
          </p>

          <div className="text-muted-foreground/50 flex cursor-not-allowed items-center gap-3 p-3">
            <BookOpen size={20} />
            <span className="font-medium">Canon Browser</span>
          </div>
        </nav>

        <div className="border-border bg-card/50 border-t p-4">
          <p className="text-muted-foreground font-mono text-xs">Vellum guides the archive</p>
        </div>
      </aside>
    </>
  );
}

interface NavLinkProps {
  to: '/' | '/projects' | '/auth';
  icon: React.ComponentType<{ size?: number }>;
  children: React.ReactNode;
  onClick?: () => void;
}

function NavLink({ to, icon: Icon, children, onClick }: NavLinkProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="hover:bg-muted mb-2 flex items-center gap-3 rounded-lg p-3 transition-colors"
      activeProps={{
        className: 'bg-primary text-primary-foreground hover:bg-primary/90',
      }}
    >
      <Icon size={20} />
      <span className="font-medium">{children}</span>
    </Link>
  );
}
