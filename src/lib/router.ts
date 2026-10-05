import { createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'

// routeTree.gen.ts is generated from src/routes/ by @tanstack/router-plugin
// (see vite.config.ts). Never edit it by hand.
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent', // start loading a route when the user hovers its link
  scrollRestoration: true,
})

// Registers our router with TanStack's types so <Link to="..."> and
// useNavigate() are type-checked against the real route paths.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
