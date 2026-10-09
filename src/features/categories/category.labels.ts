import type { IconOption } from '@/components/icon-picker'
import { CATEGORY_ICONS } from './category.domain'
import { CATEGORY_TYPES, type CategoryType } from './category.types'

export const CATEGORY_TYPE_LABELS: Readonly<Record<CategoryType, string>> = {
  expense: 'Expense',
  income: 'Income',
}

/** Items for the type segmented control. */
export const CATEGORY_TYPE_OPTIONS = CATEGORY_TYPES.map((value) => ({
  value,
  label: CATEGORY_TYPE_LABELS[value],
}))

/** Tiles for the icon picker, named after the icon ("bar_chart" reads "bar chart"). */
export const ICON_OPTIONS: readonly IconOption[] = CATEGORY_ICONS.map((value) => ({
  value,
  label: value.replaceAll('_', ' '),
}))

/** Placeholder names, so the field hints at what goes in each list. */
export const NAME_PLACEHOLDERS: Readonly<Record<CategoryType, string>> = {
  expense: 'e.g. Coffee, Car repairs',
  income: 'e.g. Side job, Pension',
}
