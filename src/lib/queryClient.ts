import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // data counts as "fresh" for 1 minute -> no refetch on remount
      gcTime: 5 * 60 * 1000, // unused cache entries are dropped after 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
