import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
  updateProduct,
} from './products.api'
import type { IProductBody } from './product.types'

// Query keys in one place so invalidation never drifts out of sync.
// `detail` starts with the same 'products' prefix, so invalidating
// `productKeys.all` refreshes the list AND every cached detail at once.
export const productKeys = {
  all: ['products'] as const,
  detail: (id: number) => ['products', id] as const,
}

export const useProducts = () => useQuery({ queryKey: productKeys.all, queryFn: getProducts })

export const useProduct = (id: number, enabled = true) =>
  useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => getProduct(id),
    enabled: enabled && Number.isFinite(id),
  })

export const useCreateProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: IProductBody) => createProduct(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  })
}

export const useUpdateProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: IProductBody }) => updateProduct(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  })
}

export const useDeleteProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteProduct(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  })
}
