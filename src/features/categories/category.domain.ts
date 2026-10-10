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

/**
 * The categories a new account starts with, and what "Add default
 * categories" adds back, in each type's list order.
 */
export const DEFAULT_CATEGORIES: readonly Pick<ICategory, 'type' | 'name' | 'icon' | 'color'>[] = [
  { type: 'expense', name: 'Food and dining', icon: 'category', color: '#EA580C' },
  { type: 'expense', name: 'Groceries', icon: 'cart', color: '#15803D' },
  { type: 'expense', name: 'Transport', icon: 'train', color: '#2456E6' },
  { type: 'expense', name: 'Housing and rent', icon: 'home', color: '#8D6E63' },
  { type: 'expense', name: 'Utilities', icon: 'bolt', color: '#B45309' },
  { type: 'expense', name: 'Phone and internet', icon: 'wifi', color: '#0284C7' },
  { type: 'expense', name: 'Shopping', icon: 'bag', color: '#DB2777' },
  { type: 'expense', name: 'Health', icon: 'hospital', color: '#DC2626' },
  { type: 'expense', name: 'Education', icon: 'education', color: '#4F46E5' },
  { type: 'expense', name: 'Entertainment', icon: 'controller', color: '#9333EA' },
  { type: 'expense', name: 'Subscriptions', icon: 'refresh', color: '#0D9488' },
  { type: 'expense', name: 'Travel', icon: 'flight', color: '#0284C7' },
  { type: 'expense', name: 'Personal care', icon: 'heart', color: '#DB2777' },
  { type: 'expense', name: 'Gifts and donations', icon: 'hand', color: '#DC2626' },
  { type: 'expense', name: 'Family and kids', icon: 'family', color: '#B45309' },
  { type: 'expense', name: 'Insurance', icon: 'shield', color: '#0D9488' },
  { type: 'expense', name: 'Fees and charges', icon: 'receipt', color: '#64748B' },
  { type: 'income', name: 'Salary', icon: 'money', color: '#15803D' },
  { type: 'income', name: 'Business and freelance', icon: 'work', color: '#2456E6' },
  { type: 'income', name: 'Bonus', icon: 'star', color: '#B45309' },
  { type: 'income', name: 'Interest and dividends', icon: 'savings', color: '#0D9488' },
  { type: 'income', name: 'Rental income', icon: 'building', color: '#8D6E63' },
  { type: 'income', name: 'Gifts received', icon: 'heart', color: '#DB2777' },
  { type: 'income', name: 'Refunds', icon: 'undo', color: '#0284C7' },
  { type: 'income', name: 'Other income', icon: 'add', color: '#4F46E5' },
]

/** The next place in a type's list: after its last category. */
export function nextSortOrder(
  categories: readonly Pick<ICategory, 'type' | 'sortOrder'>[],
  type: CategoryType,
): number {
  return Math.max(-1, ...categories.filter((c) => c.type === type).map((c) => c.sortOrder)) + 1
}

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
  candidate: Omit<Named, 'id'> & { id?: string },
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
