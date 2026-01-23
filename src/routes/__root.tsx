import { HeadContent, Scripts, createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { Compass } from 'lucide-react';
// import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
// import { TanStackDevtools } from '@tanstack/react-devtools';

import { AppLayout } from '../components/AppLayout';
import { EmptyState } from '../components/EmptyState';
import { buttonVariants } from '../components/ui/button';
import { Toaster } from '../components/ui/sonner';
import { KeyboardShortcutsProvider } from '../components/KeyboardShortcuts';
import { ErrorBoundary } from '../components/ErrorBoundary';
import ConvexProvider from '../integrations/convex/provider';

import appCss from '../styles.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Realm Sync',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        href: '/favicon.ico',
      },
    ],
  }),

  component: RootLayout,
  shellComponent: RootDocument,
  notFoundComponent: RootNotFound,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootLayout() {
  return (
    <ConvexProvider>
      <KeyboardShortcutsProvider>
        <ErrorBoundary>
          <AppLayout>
            <Outlet />
          </AppLayout>
        </ErrorBoundary>
        <Toaster position="bottom-right" />
      </KeyboardShortcutsProvider>
      {/* <TanStackDevtools
        config={{
          position: 'bottom-right',
        }}
        plugins={[
          {
            name: 'Tanstack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      /> */}
    </ConvexProvider>
  );
}

function RootNotFound() {
  return (
    <div className="bg-background relative flex min-h-[100svh] w-full items-center justify-center overflow-hidden px-6 py-10">
      <div className="pointer-events-none absolute inset-0 opacity-35 [background:radial-gradient(900px_circle_at_50%_-20%,var(--primary)_0%,transparent_60%)]" />
      <div className="border-border/70 bg-card/80 relative w-full max-w-xl rounded-2xl border p-2 shadow-[0_20px_60px_-35px_oklch(0.72_0.11_65_/_0.35)] backdrop-blur">
        <EmptyState
          icon={<Compass className="size-5" />}
          title="Page not found"
          description="That route does not exist or was moved."
          action={
            <Link to="/" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              Back to dashboard
            </Link>
          }
          className="p-10"
        />
      </div>
    </div>
  );
}
