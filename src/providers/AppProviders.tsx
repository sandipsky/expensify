import { LUIProvider } from '@lumen-ui/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { queryClient, router } from '@/lib'

export const AppProviders = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <LUIProvider>
        <RouterProvider router={router} />
      </LUIProvider>
    </QueryClientProvider>
  )
}
