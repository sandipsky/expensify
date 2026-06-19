import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { NotFound, RouteError, RoutePending } from './components/common';

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultErrorComponent: ({ error, reset }) => (
    <RouteError error={error} reset={reset} />
  ),
  defaultNotFoundComponent: () => <NotFound />,
  defaultPendingComponent: () => <RoutePending />,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
