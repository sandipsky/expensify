import { createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'

// routeTree.gen.ts is generated from src/routes/ by @tanstack/router-plugin
// (see vite.config.ts). Never edit it by hand.
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent', // start loading a route when the user hovers its link
  // The layout's content pane scrolls, not the window: a new page starts at its
  // top, and back/forward return to where it was (see AppLayout's restoration id).
  scrollRestoration: true,
  scrollToTopSelectors: ['.app-layout__content'],
})

// Registers our router with TanStack's types so <Link to="..."> and
// useNavigate() are type-checked against the real route paths.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
