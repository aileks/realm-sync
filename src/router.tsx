import { createRouter } from '@tanstack/react-router';
import * as Sentry from '@sentry/tanstackstart-react';
import { routeTree } from './routeTree.gen';
import { env } from './env';

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: {},
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  if (!router.isServer && env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: env.VITE_SENTRY_DSN,
      integrations: [],
      tracesSampleRate: 1.0,
      sendDefaultPii: true,
    });
  }

  return router;
};
