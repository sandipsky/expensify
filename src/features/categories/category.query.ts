import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ICategoryBody } from './category.types'

// Loaded on first use, and the Firestore SDK with it, so the login page starts
// without it (src/lib/firestore.ts).
const api = () => import('./categories.api')

// Query keys in one place so invalidation never drifts out of sync.
export const categoryKeys = {
  all: ['categories'] as const,
}

/** Every category, archived ones too. A few dozen at most, so one query serves the app. */
export const useCategories = () =>
  useQuery({ queryKey: categoryKeys.all, queryFn: async () => (await api()).getCategories() })

// Every write invalidates the list, so both tabs, the archived section and,
// later, the pickers all refresh from one place.
const useInvalidateCategories = () => {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: categoryKeys.all })
}

export const useCreateCategory = () => {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: async (body: ICategoryBody) => (await api()).createCategory(body),
    onSuccess: invalidate,
  })
}

export const useUpdateCategory = () => {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: ICategoryBody }) =>
      (await api()).updateCategory(id, body),
    onSuccess: invalidate,
  })
}

export const useSetCategoryArchived = () => {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) =>
      (await api()).setCategoryArchived(id, archived),
    onSuccess: invalidate,
  })
}

export const useDeleteCategory = () => {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: async (id: string) => (await api()).deleteCategory(id),
    onSuccess: invalidate,
  })
}

export const useAddDefaultCategories = () => {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: async () => (await api()).addDefaultCategories(),
    onSuccess: invalidate,
  })
}
