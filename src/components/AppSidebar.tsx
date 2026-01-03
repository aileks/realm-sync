import { useState, useEffect } from 'react';
import { Link, useRouterState, useParams, useNavigate } from '@tanstack/react-router';
import { useConvexAuth } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import {
  FolderOpen,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Palette,
  Sun,
  Moon,
  Laptop,
  LogOut,
  User,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const THEMES = [
  { id: 'default', name: 'Ashen Tome', icon: Laptop },
  { id: 'twilight-study', name: 'Twilight Study', icon: Moon },
  { id: 'amber-archive', name: 'Amber Archive', icon: Sun },
] as const;

type Theme = (typeof THEMES)[number]['id'];

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'default';
  const theme = localStorage.getItem('theme');
  const matchedTheme = THEMES.find((t) => t.id === theme);
  return matchedTheme ? matchedTheme.id : 'default';
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const { isAuthenticated } = useConvexAuth();
  const params = useParams({ strict: false });
  const navigate = useNavigate();
  const { signOut } = useAuthActions();

  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'default') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: '/' });
  };

  return (
    <aside
      className={cn(
        'bg-sidebar border-sidebar-border text-sidebar-foreground fixed top-0 left-0 z-30 flex h-full flex-col border-r transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div
        className={cn(
          'border-sidebar-border flex h-16 items-center border-b px-4',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-sidebar-primary flex size-8 items-center justify-center rounded-lg">
              <BookOpen className="text-sidebar-primary-foreground size-5" />
            </div>
            <span className="font-serif text-lg font-semibold">Realm Sync</span>
          </Link>
        )}
        {collapsed && (
          <Link to="/">
            <div className="bg-sidebar-primary flex size-8 items-center justify-center rounded-lg">
              <BookOpen className="text-sidebar-primary-foreground size-5" />
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

        {isAuthenticated && params.projectId && (
          <>
            <div className="my-4 px-2">
              <div className="border-sidebar-border border-t" />
            </div>

            {!collapsed && (
              <p className="text-muted-foreground mb-2 px-3 font-mono text-[10px] tracking-widest uppercase">
                Project Tools
              </p>
            )}

            <ProjectNavItem
              projectId={params.projectId}
              to="review"
              icon={Sparkles}
              collapsed={collapsed}
            >
              Review Extractions
            </ProjectNavItem>
          </>
        )}

        <div className="my-4 px-2">
          <div className="border-sidebar-border border-t" />
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

      <div className="border-sidebar-border flex flex-col gap-1 border-t p-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'w-full cursor-pointer',
              collapsed ? 'justify-center px-0' : 'justify-start'
            )}
          >
            <Palette className="size-4" />
            {!collapsed && <span className="ml-2">Theme</span>}
          </DropdownMenuTrigger>
          <DropdownMenuContent align={collapsed ? 'center' : 'start'} side="right" sideOffset={10}>
            <DropdownMenuLabel>Select Theme</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {THEMES.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onClick={() => setTheme(t.id)}
                className="justify-between"
              >
                <div className="flex items-center gap-2">
                  <t.icon className="size-4" />
                  <span>{t.name}</span>
                </div>
                {theme === t.id && <Check className="size-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {isAuthenticated && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'w-full cursor-pointer',
                collapsed ? 'justify-center px-0' : 'justify-start'
              )}
            >
              <User className="size-4" />
              {!collapsed && <span className="ml-2">Account</span>}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={collapsed ? 'center' : 'start'}
              side="right"
              sideOffset={10}
              className="w-48"
            >
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: '/projects' })}>
                <FolderOpen className="mr-2 size-4" />
                Projects
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 size-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="border-sidebar-border my-1 border-t" />

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

interface ProjectNavItemProps {
  projectId: string;
  to: 'review';
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  collapsed: boolean;
}

function ProjectNavItem({ projectId, to, icon: Icon, children, collapsed }: ProjectNavItemProps) {
  const routerState = useRouterState();
  const fullPath = `/projects/${projectId}/${to}`;
  const isActive = routerState.location.pathname.startsWith(fullPath);

  const content = (
    <Link
      to="/projects/$projectId/review"
      params={{ projectId }}
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
  const navigate = useNavigate();
  const { signOut } = useAuthActions();

  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'default') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleSignOut = async () => {
    await signOut();
    onClose();
    void navigate({ to: '/' });
  };

  return (
    <nav className="flex flex-col gap-1 p-4">
      {isAuthenticated && (
        <MobileNavItem to="/projects" icon={FolderOpen} onClick={onClose}>
          Projects
        </MobileNavItem>
      )}

      <div className="my-4">
        <div className="border-sidebar-border border-t" />
      </div>

      <p className="text-muted-foreground mb-2 px-3 font-mono text-[10px] tracking-widest uppercase">
        Project Tools
      </p>

      <div className="mb-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'w-full cursor-pointer justify-start'
            )}
          >
            <Palette className="size-4" />
            <span className="ml-2">Theme</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="bottom">
            <DropdownMenuLabel>Select Theme</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {THEMES.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onClick={() => setTheme(t.id)}
                className="justify-between"
              >
                <div className="flex items-center gap-2">
                  <t.icon className="size-4" />
                  <span>{t.name}</span>
                </div>
                {theme === t.id && <Check className="size-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isAuthenticated && (
        <div className="mb-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'w-full cursor-pointer justify-start'
              )}
            >
              <User className="size-4" />
              <span className="ml-2">Account</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="bottom">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  onClose();
                  void navigate({ to: '/projects' });
                }}
              >
                <FolderOpen className="mr-2 size-4" />
                Projects
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 size-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
