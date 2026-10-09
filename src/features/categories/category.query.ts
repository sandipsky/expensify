import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addDefaultCategories,
  createCategory,
  deleteCategory,
  getCategories,
  setCategoryArchived,
  updateCategory,
} from './categories.api'
import type { ICategoryBody } from './category.types'

// Query keys in one place so invalidation never drifts out of sync.
export const categoryKeys = {
  all: ['categories'] as const,
}

/** Every category, archived ones too. A few dozen at most, so one query serves the app. */
export const useCategories = () => useQuery({ queryKey: categoryKeys.all, queryFn: getCategories })

// Every write invalidates the list, so both tabs, the archived section and,
// later, the pickers all refresh from one place.
const useInvalidateCategories = () => {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: categoryKeys.all })
}

export const useCreateCategory = () => {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: (body: ICategoryBody) => createCategory(body),
    onSuccess: invalidate,
  })
}

export const useUpdateCategory = () => {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ICategoryBody }) => updateCategory(id, body),
    onSuccess: invalidate,
  })
}

export const useSetCategoryArchived = () => {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: ({ id, archived }: { id: number; archived: boolean }) =>
      setCategoryArchived(id, archived),
    onSuccess: invalidate,
  })
}

export const useDeleteCategory = () => {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: invalidate,
  })
}

export const useAddDefaultCategories = () => {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: () => addDefaultCategories(),
    onSuccess: invalidate,
  })
}
