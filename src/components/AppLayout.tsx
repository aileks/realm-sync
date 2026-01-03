import { useState, useEffect } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useConvexAuth } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { Menu, LogOut, User, FolderOpen } from 'lucide-react';
import { AppSidebar, MobileSidebarContent } from './AppSidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthPage = routerState.location.pathname === '/auth';
  const isLandingPage = routerState.location.pathname === '/' && !isAuthenticated;

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  async function handleSignOut() {
    await signOut();
    void navigate({ to: '/' });
  }

  if (isAuthPage || isLandingPage) {
    return <>{children}</>;
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="hidden lg:block">
        <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      <div
        className={cn(
          'flex min-h-screen flex-col transition-all duration-300',
          'lg:ml-64',
          collapsed && 'lg:ml-16'
        )}
      >
        <header className="bg-card border-border sticky top-0 z-20 flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-4">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="size-5" />
                  </Button>
                }
              />
              <SheetContent side="left" showCloseButton={true}>
                <SheetHeader>
                  <SheetTitle className="font-serif">Navigation</SheetTitle>
                </SheetHeader>
                <MobileSidebarContent onClose={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex items-center gap-2">
            {isLoading ?
              null
            : isAuthenticated ?
              <DropdownMenu>
                <DropdownMenuTrigger className="hover:bg-muted flex items-center gap-2 rounded-lg p-2 transition-colors">
                  <User className="size-5" />
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

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
