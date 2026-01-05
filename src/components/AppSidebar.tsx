import { useState, useEffect } from 'react';
import { Link, useRouterState, useParams, useNavigate, useSearch } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
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
  FileText,
  Users,
  ScrollText,
  AlertTriangle,
  History,
  Home,
} from 'lucide-react';
import { VellumButton } from '@/components/Vellum';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

type AppSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

const THEMES = [
  { id: 'default', name: 'Fireside', icon: Laptop },
  { id: 'twilight', name: 'Twilight', icon: Moon },
  { id: 'daylight', name: 'Daylight', icon: Sun },
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
  const user = useQuery(api.users.viewer);
  const params = useParams({ strict: false });
  const search = useSearch({ strict: false });
  const navigate = useNavigate();
  const { signOut } = useAuthActions();

  // projectId from route params OR search params (for entity detail page)
  const projectId = params.projectId ?? search.project;

  const [theme, setTheme] = useState<Theme>('default');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = getStoredTheme();
    if (stored !== 'default') {
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === 'default') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

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
          <NavItem to="/projects" icon={Home} collapsed={collapsed}>
            Home
          </NavItem>
        )}

        <RecentProjects collapsed={collapsed} />

        {isAuthenticated && projectId && (
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
              projectId={projectId}
              to="documents"
              icon={FileText}
              collapsed={collapsed}
            >
              Documents
            </ProjectNavItem>

            <ProjectNavItem projectId={projectId} to="canon" icon={BookOpen} collapsed={collapsed}>
              Canon Browser
            </ProjectNavItem>

            <ProjectNavItem projectId={projectId} to="entities" icon={Users} collapsed={collapsed}>
              Entities
            </ProjectNavItem>

            <ProjectNavItem
              projectId={projectId}
              to="facts"
              icon={ScrollText}
              collapsed={collapsed}
            >
              Facts
            </ProjectNavItem>

            <ProjectNavItem
              projectId={projectId}
              to="alerts"
              icon={AlertTriangle}
              collapsed={collapsed}
            >
              Alerts
            </ProjectNavItem>

            <ProjectNavItem projectId={projectId} to="review" icon={Sparkles} collapsed={collapsed}>
              Review
            </ProjectNavItem>
          </>
        )}
      </nav>

      <div className="border-sidebar-border flex flex-col gap-1 border-t p-2">
        <VellumButton collapsed={collapsed} />

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
          <DropdownMenuContent align="start" side="top" sideOffset={8}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Select Theme</DropdownMenuLabel>
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
            </DropdownMenuGroup>
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
              <div className="relative flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-full">
                {user?.image ?
                  <img
                    src={user.image}
                    alt={user.name ?? 'User'}
                    className="aspect-square h-full w-full object-cover"
                  />
                : user?.name ?
                  <div className="bg-primary text-primary-foreground flex h-full w-full items-center justify-center text-[8px] font-medium">
                    {user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                : <User className="size-4" />}
              </div>
              {!collapsed && <span className="ml-2 truncate">{user?.name ?? 'Account'}</span>}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={collapsed ? 'center' : 'start'}
              side="right"
              sideOffset={10}
              className="w-48"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigate({ to: '/projects' })}>
                  <FolderOpen className="mr-2 size-4" />
                  Projects
                </DropdownMenuItem>
              </DropdownMenuGroup>
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

type NavItemProps = {
  to: '/' | '/projects' | '/auth';
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  collapsed: boolean;
};

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

type ProjectNavItemProps = {
  projectId: string;
  to: 'documents' | 'canon' | 'entities' | 'facts' | 'alerts' | 'review';
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  collapsed: boolean;
};

const projectRoutes = {
  documents: '/projects/$projectId/documents',
  canon: '/projects/$projectId/canon',
  entities: '/projects/$projectId/entities',
  facts: '/projects/$projectId/facts',
  alerts: '/projects/$projectId/alerts',
  review: '/projects/$projectId/review',
} as const;

function ProjectNavItem({ projectId, to, icon: Icon, children, collapsed }: ProjectNavItemProps) {
  const routerState = useRouterState();
  const fullPath = `/projects/${projectId}/${to}`;
  const isActive = routerState.location.pathname.startsWith(fullPath);

  const content = (
    <Link
      to={projectRoutes[to]}
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
  const user = useQuery(api.users.viewer);
  const navigate = useNavigate();
  const { signOut } = useAuthActions();

  const [theme, setTheme] = useState<Theme>('default');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = getStoredTheme();
    if (stored !== 'default') {
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === 'default') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

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
            <DropdownMenuGroup>
              <DropdownMenuLabel>Select Theme</DropdownMenuLabel>
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
            </DropdownMenuGroup>
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
              <div className="relative flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-full">
                {user?.image ?
                  <img
                    src={user.image}
                    alt={user.name ?? 'User'}
                    className="aspect-square h-full w-full object-cover"
                  />
                : user?.name ?
                  <div className="bg-primary text-primary-foreground flex h-full w-full items-center justify-center text-[8px] font-medium">
                    {user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                : <User className="size-4" />}
              </div>
              <span className="ml-2 truncate">{user?.name ?? 'Account'}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="bottom">
              <DropdownMenuGroup>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => {
                    onClose();
                    void navigate({ to: '/projects' });
                  }}
                >
                  <FolderOpen className="mr-2 size-4" />
                  Projects
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 size-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </nav>
  );
}

type MobileNavItemProps = {
  to: '/' | '/projects' | '/auth';
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick: () => void;
};

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

const RECENT_PROJECTS_KEY = 'realm-sync:recent-projects';
const MAX_RECENT_PROJECTS = 5;

type RecentProject = {
  id: string;
  name: string;
  visitedAt: number;
};

function getRecentProjects(): RecentProject[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_PROJECTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addRecentProject(id: string, name: string) {
  if (typeof window === 'undefined') return;
  try {
    const recent = getRecentProjects().filter((p) => p.id !== id);
    recent.unshift({ id, name, visitedAt: Date.now() });
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT_PROJECTS)));
  } catch {
    /* empty */
  }
}

function RecentProjects({ collapsed }: { collapsed: boolean }) {
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const { isAuthenticated } = useConvexAuth();

  useEffect(() => {
    setRecentProjects(getRecentProjects());

    function handleStorage(e: StorageEvent) {
      if (e.key === RECENT_PROJECTS_KEY) {
        setRecentProjects(getRecentProjects());
      }
    }

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  if (!isAuthenticated || recentProjects.length === 0) return null;

  return (
    <>
      <div className="my-4 px-2">
        <div className="border-sidebar-border border-t" />
      </div>

      {!collapsed && (
        <p className="text-muted-foreground mb-2 px-3 font-mono text-[10px] tracking-widest uppercase">
          <History className="mr-1 inline size-3" />
          Recent
        </p>
      )}

      {recentProjects.slice(0, collapsed ? 3 : 5).map((project) => {
        const content = (
          <Link
            key={project.id}
            to="/projects/$projectId"
            params={{ projectId: project.id }}
            className={cn(
              'flex items-center gap-3 rounded-lg p-2 transition-colors',
              collapsed && 'justify-center',
              'hover:bg-muted text-foreground text-sm'
            )}
          >
            <FolderOpen className="size-4 opacity-60" />
            {!collapsed && <span className="truncate text-xs">{project.name}</span>}
          </Link>
        );

        if (collapsed) {
          return (
            <Tooltip key={project.id}>
              <TooltipTrigger render={content} />
              <TooltipContent side="right">{project.name}</TooltipContent>
            </Tooltip>
          );
        }

        return content;
      })}
    </>
  );
}
