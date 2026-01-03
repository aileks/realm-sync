import { useState, useEffect } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useConvexAuth } from 'convex/react';
import { Menu } from 'lucide-react';
import { AppSidebar, MobileSidebarContent } from './AppSidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const { isAuthenticated, isLoading } = useConvexAuth();
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
                className={cn(
                  'hover:bg-muted flex items-center justify-center rounded-md p-2 transition-colors lg:hidden'
                )}
              >
                <Menu className="size-5" />
                <span className="sr-only">Toggle menu</span>
              </SheetTrigger>
              <SheetContent side="left" showCloseButton={true}>
                <SheetHeader>
                  <SheetTitle className="font-serif">Navigation</SheetTitle>
                </SheetHeader>
                <MobileSidebarContent onClose={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex items-center gap-2">
            {!isLoading && !isAuthenticated && (
              <Button size="sm" onClick={() => navigate({ to: '/auth' })}>
                Sign In
              </Button>
            )}
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
