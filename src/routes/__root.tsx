import { HeadContent, Scripts, createRootRoute, Outlet } from '@tanstack/react-router';
// import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
// import { TanStackDevtools } from '@tanstack/react-devtools';

import { AppLayout } from '../components/AppLayout';
import { Toaster } from '../components/ui/sonner';
import { OnboardingModal } from '../components/OnboardingModal';
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
    ],
  }),

  component: RootLayout,
  shellComponent: RootDocument,
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
      <AppLayout>
        <Outlet />
      </AppLayout>
      <Toaster position="bottom-right" />
      <OnboardingModal />
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
