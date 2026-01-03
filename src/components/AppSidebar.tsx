import { Link, useRouterState } from '@tanstack/react-router';
import { useConvexAuth } from 'convex/react';
import { FolderOpen, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const { isAuthenticated } = useConvexAuth();

  return (
    <aside
      className={cn(
        'bg-card border-border fixed top-0 left-0 z-30 flex h-full flex-col border-r transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div
        className={cn(
          'border-border flex h-16 items-center border-b px-4',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-primary flex size-8 items-center justify-center rounded-lg">
              <BookOpen className="text-primary-foreground size-5" />
            </div>
            <span className="font-serif text-lg font-semibold">Realm Sync</span>
          </Link>
        )}
        {collapsed && (
          <Link to="/">
            <div className="bg-primary flex size-8 items-center justify-center rounded-lg">
              <BookOpen className="text-primary-foreground size-5" />
            </div>
          </Link>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {isAuthenticated && (
          <NavItem to="/projects" icon={FolderOpen} collapsed={collapsed}>
            Projects
          </NavItem>
        )}

        <div className="my-4 px-2">
          <div className="border-border border-t" />
        </div>

        {!collapsed && (
          <p className="text-muted-foreground mb-2 px-3 font-mono text-[10px] tracking-widest uppercase">
            Coming Soon
          </p>
        )}

        <div
          className={cn(
            'text-muted-foreground/50 flex cursor-not-allowed items-center gap-3 rounded-lg p-3',
            collapsed && 'justify-center'
          )}
        >
          <BookOpen className="size-5" />
          {!collapsed && <span className="text-sm">Canon Browser</span>}
        </div>
      </nav>

      <div className="border-border border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn('w-full', collapsed ? 'px-0' : 'justify-start')}
        >
          {collapsed ?
            <ChevronRight className="size-4" />
          : <>
              <ChevronLeft className="mr-2 size-4" />
              Collapse
            </>
          }
        </Button>
      </div>
    </aside>
  );
}

interface NavItemProps {
  to: '/' | '/projects' | '/auth';
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  collapsed: boolean;
}

function NavItem({ to, icon: Icon, children, collapsed }: NavItemProps) {
  const routerState = useRouterState();
  const isActive = routerState.location.pathname === to;

  const content = (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-3 rounded-lg p-3 transition-colors',
        collapsed && 'justify-center',
        isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'
      )}
    >
      <Icon className="size-5" />
      {!collapsed && <span className="text-sm font-medium">{children}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={content} />
        <TooltipContent side="right">{children}</TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

export function MobileSidebarContent({ onClose }: { onClose: () => void }) {
  const { isAuthenticated } = useConvexAuth();

  return (
    <nav className="flex flex-col gap-1 p-4">
      {isAuthenticated && (
        <MobileNavItem to="/projects" icon={FolderOpen} onClick={onClose}>
          Projects
        </MobileNavItem>
      )}

      <div className="my-4">
        <div className="border-border border-t" />
      </div>

      <p className="text-muted-foreground mb-2 px-3 font-mono text-[10px] tracking-widest uppercase">
        Coming Soon
      </p>

      <div className="text-muted-foreground/50 flex cursor-not-allowed items-center gap-3 rounded-lg p-3">
        <BookOpen className="size-5" />
        <span className="text-sm">Canon Browser</span>
      </div>
    </nav>
  );
}

interface MobileNavItemProps {
  to: '/' | '/projects' | '/auth';
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick: () => void;
}

function MobileNavItem({ to, icon: Icon, children, onClick }: MobileNavItemProps) {
  const routerState = useRouterState();
  const isActive = routerState.location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg p-3 transition-colors',
        isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'
      )}
    >
      <Icon className="size-5" />
      <span className="text-sm font-medium">{children}</span>
    </Link>
  );
}
