import { useState, useEffect } from 'react';
import { useNavigate, useRouterState, useParams, useSearch } from '@tanstack/react-router';
import { useConvexAuth, useQuery } from 'convex/react';
import { Menu } from 'lucide-react';
import { AppSidebar, MobileSidebarContent } from './AppSidebar';
import { OnboardingModal } from './OnboardingModal';
import { TutorialTour } from './TutorialTour';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const params = useParams({ strict: false });
  const search = useSearch({ strict: false });
  const [collapsed, setCollapsed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const projectId = params.projectId ?? search.project;
  const project = useQuery(
    api.projects.get,
    projectId ? { id: projectId as Id<'projects'> } : 'skip'
  );

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === 'true') {
      setCollapsed(true);
    }
    setIsLoaded(true);
  }, []);

  const isAuthPage = routerState.location.pathname === '/auth';
  const isLandingPage = routerState.location.pathname === '/' && !isAuthenticated;

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    }
  }, [collapsed, isLoaded]);

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
        <header className="bg-card border-border sticky top-0 z-20 flex h-16 items-center justify-between border-b px-4 lg:hidden">
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

      {isAuthenticated && <OnboardingModal />}
      {isAuthenticated && <TutorialTour isTutorialProject={project?.isTutorial === true} />}
    </div>
  );
}
