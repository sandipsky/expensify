import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <Outlet />
      {/* Devtools render nothing in production builds */}
      <TanStackRouterDevtools position="bottom-right" />
    </>
  )
}
