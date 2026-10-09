import { apiClient } from '@/lib'
import type { ICategory, ICategoryBody } from './category.types'

export const getCategories = async () => {
  const res = await apiClient.get<ICategory[]>('/categories')
  return res.data
}

/** The type can't change; the server rejects a body that tries. */
export const updateCategory = async (id: number, body: ICategoryBody) => {
  const res = await apiClient.put<ICategory>(`/categories/${id}`, body)
  return res.data
}

export const createCategory = async (body: ICategoryBody) => {
  const res = await apiClient.post<ICategory>('/categories', body)
  return res.data
}

export const setCategoryArchived = async (id: number, archived: boolean) => {
  const res = await apiClient.patch<ICategory>(`/categories/${id}/archived`, { archived })
  return res.data
}

export const deleteCategory = async (id: number) => {
  await apiClient.delete(`/categories/${id}`)
}

/** Adds the default categories the user doesn't have yet; resolves to the ones added. */
export const addDefaultCategories = async () => {
  const res = await apiClient.post<ICategory[]>('/categories/defaults')
  return res.data
}
