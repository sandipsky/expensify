import type { LUIIconName } from '@lumen-ui/react'

export const CATEGORY_TYPES = ['expense', 'income'] as const

export type CategoryType = (typeof CATEGORY_TYPES)[number]

export interface ICategory {
  id: string
  /** 1-30 characters, unique within its type, ignoring case. */
  name: string
  /** Fixed once created, since entries of that type use it. */
  type: CategoryType
  icon: LUIIconName
  /** Hex color, e.g. `#EA580C`; picked for the category when it's added. */
  color: string
  /** Hidden from pickers; existing entries keep it. */
  archived: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// What a form saves when creating/updating - categories.api.ts sets the id,
// the archived flag, the sort order and the timestamps.
export type ICategoryBody = Omit<
  ICategory,
  'id' | 'archived' | 'sortOrder' | 'createdAt' | 'updatedAt'
>
