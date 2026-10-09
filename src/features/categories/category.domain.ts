// Category rules: pure functions shared by the categories screens and, later,
// the transaction form's picker, reports and budgets.
import type { LUIIconName } from '@lumen-ui/react'
import type { CategoryType, ICategory } from './category.types'

/** Longest category name. */
export const MAX_CATEGORY_NAME = 30

/**
 * The colors a new category can get. Each keeps at least 3:1 contrast against
 * its own 12% tint, the icon badge's background.
 */
export const CATEGORY_COLORS = [
  '#DC2626', // red
  '#EA580C', // orange
  '#B45309', // amber
  '#15803D', // green
  '#0D9488', // teal
  '#0284C7', // sky
  '#2456E6', // blue
  '#4F46E5', // indigo
  '#9333EA', // purple
  '#DB2777', // pink
  '#8D6E63', // brown
  '#64748B', // slate
] as const

/**
 * The icons the picker offers: the generic default first, then roughly by
 * theme. Only icons lumen-ui ships; there is no custom set.
 */
export const CATEGORY_ICONS = [
  'category',
  'cart',
  'bag',
  'checkroom',
  'home',
  'building',
  'bolt',
  'wifi',
  'call',
  'car',
  'fuel',
  'train',
  'truck',
  'flight',
  'location',
  'hospital',
  'fitness',
  'heart',
  'family',
  'users',
  'education',
  'notebook',
  'music',
  'controller',
  'image',
  'star',
  'calendar',
  'event_repeat',
  'refresh',
  'receipt',
  'file',
  'shield',
  'lock',
  'work',
  'factory',
  'money',
  'moneys',
  'card',
  'bank',
  'savings',
  'wallet',
  'bar_chart',
  'pie_chart',
  'hand',
  'configuration',
  'box',
  'undo',
  'add',
] as const satisfies readonly LUIIconName[]

/** A new category's icon until the user picks one. */
export const DEFAULT_CATEGORY_ICON: LUIIconName = 'category'

type Named = Pick<ICategory, 'id' | 'name' | 'type'>

/** How names compare for uniqueness: trimmed and ignoring case. */
export function nameKey(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Whether another category of the same type already has this name, ignoring
 * case. Archived categories count, so restoring one can never make a
 * duplicate. Pass the category's own `id` when renaming it.
 */
export function isNameTaken(
  categories: readonly Named[],
  candidate: Omit<Named, 'id'> & { id?: number },
): boolean {
  const key = nameKey(candidate.name)
  return categories.some(
    (c) => c.id !== candidate.id && c.type === candidate.type && nameKey(c.name) === key,
  )
}

/** By `sortOrder`, then name. */
export function compareCategories(
  a: Pick<ICategory, 'sortOrder' | 'name'>,
  b: Pick<ICategory, 'sortOrder' | 'name'>,
): number {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
}

/** How the Categories page lists one type's categories. */
export interface CategoryLists {
  active: ICategory[]
  /** Archived categories, hidden from pickers. */
  archived: ICategory[]
}

export function categoryLists(categories: readonly ICategory[], type: CategoryType): CategoryLists {
  const ofType = categories.filter((c) => c.type === type).sort(compareCategories)
  return {
    active: ofType.filter((c) => !c.archived),
    archived: ofType.filter((c) => c.archived),
  }
}

/**
 * A color for a new category, picked at random. Colors the type's categories
 * don't use yet come first, so new ones look different from their neighbours;
 * once every color is taken, any palette color will do.
 */
export function randomColor(
  categories: readonly Pick<ICategory, 'type' | 'color'>[],
  type: CategoryType,
  random: () => number = Math.random,
): string {
  const used = new Set(categories.filter((c) => c.type === type).map((c) => c.color.toUpperCase()))
  const unused = CATEGORY_COLORS.filter((color) => !used.has(color))
  const pool = unused.length ? unused : CATEGORY_COLORS
  return pool[Math.floor(random() * pool.length)]
}
