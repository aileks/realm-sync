import { HeadContent, Scripts, createRootRoute, Link, Outlet } from '@tanstack/react-router';
// import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
// import { TanStackDevtools } from '@tanstack/react-devtools';

import { AppLayout } from '../components/AppLayout';
import { EmptyState } from '../components/EmptyState';
import { buttonVariants } from '../components/ui/button';
import { Toaster } from '../components/ui/sonner';
import { KeyboardShortcutsProvider } from '../components/KeyboardShortcuts';
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
        <AppLayout>
          <Outlet />
        </AppLayout>
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
    <div className="flex w-full flex-1 items-center justify-center p-8">
      <EmptyState
        title="Page not found"
        description="That route does not exist or was moved."
        action={
          <Link to="/" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Back to dashboard
          </Link>
        }
      />
    </div>
  );
}
