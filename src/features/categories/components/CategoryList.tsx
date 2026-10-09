import { useState } from 'react'
import {
  LUIAccordion,
  LUIAccordionItem,
  LUIBreadcrumb,
  LUIButton,
  LUICard,
  LUIIcon,
  LUISkeleton,
  LUITab,
  LUITabs,
} from '@lumen-ui/react'
import { EmptyState } from '@/components/empty-state'
import { getApiErrorMessage } from '@/lib'
import { useCategoryActions } from '../category.actions'
import { categoryLists } from '../category.domain'
import { CATEGORY_TYPE_LABELS } from '../category.labels'
import { useCategories } from '../category.query'
import { CATEGORY_TYPES, type CategoryType, type ICategory } from '../category.types'
import { CategoryRow } from './CategoryRow'
import './CategoryList.scss'

/** `/categories`: expense and income categories on their own tabs, archived ones under each. */
export const CategoryList = () => {
  const { data: categories, isLoading, isError, error } = useCategories()
  const actions = useCategoryActions()

  /** The open tab; "Add category" adds to it. */
  const [type, setType] = useState<CategoryType>('expense')

  const selectType = (value: unknown) => {
    if (CATEGORY_TYPES.includes(value as CategoryType)) setType(value as CategoryType)
  }

  if (isLoading) {
    return (
      <div className="categories-page">
        <LUIBreadcrumb title="Categories" />
        <LUISkeleton height="44px" />
        <LUISkeleton height="360px" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="categories-page">
        <LUIBreadcrumb title="Categories" />
        <div className="alert error">{getApiErrorMessage(error)}</div>
      </div>
    )
  }

  const all = categories ?? []

  const addButton = (
    <LUIButton size="lg" onClick={() => actions.create(type)}>
      <LUIIcon name="add" color="inherit" />
      Add category
    </LUIButton>
  )

  const rows = (list: ICategory[], label: string) => (
    <ul className="category-list" aria-label={label}>
      {list.map((category) => (
        <li key={category.id}>
          <CategoryRow
            category={category}
            onEdit={() => actions.edit(category)}
            onArchive={() => actions.archive(category)}
            onRestore={() => actions.restore(category)}
            onDelete={() => actions.delete(category)}
          />
        </li>
      ))}
    </ul>
  )

  return (
    <div className="categories-page">
      <div className="categories-page__header">
        <LUIBreadcrumb title="Categories" />
        {all.length > 0 && addButton}
      </div>

      {all.length === 0 ? (
        <LUICard>
          <EmptyState
            icon="category"
            title="No categories yet"
            message="Start with the usual ones, such as Groceries, Transport and Salary, and change them anytime. Or build your own list."
          >
            <LUIButton size="lg" onClick={actions.addDefaults}>
              Add default categories
            </LUIButton>
            <LUIButton size="lg" variant="outlined" onClick={() => actions.create(type)}>
              Add category
            </LUIButton>
          </EmptyState>
        </LUICard>
      ) : (
        <LUITabs value={type} onChange={selectType}>
          {CATEGORY_TYPES.map((t) => {
            const label = CATEGORY_TYPE_LABELS[t]
            const lists = categoryLists(all, t)
            return (
              <LUITab key={t} label={label} value={t}>
                <div className="categories-panel">
                  {lists.active.length > 0 ? (
                    <LUICard padding="none">{rows(lists.active, `${label} categories`)}</LUICard>
                  ) : (
                    <LUICard>
                      <EmptyState
                        icon="category"
                        title={`No ${label.toLowerCase()} categories`}
                        message="Add one to sort these entries your way."
                      >
                        <LUIButton size="lg" onClick={() => actions.create(t)}>
                          Add category
                        </LUIButton>
                      </EmptyState>
                    </LUICard>
                  )}

                  {lists.archived.length > 0 && (
                    <LUIAccordion>
                      <LUIAccordionItem title={`Archived (${lists.archived.length})`}>
                        <p className="categories-panel__note">
                          Hidden from pickers. Entries that use them keep them.
                        </p>
                        {rows(lists.archived, `Archived ${label.toLowerCase()} categories`)}
                      </LUIAccordionItem>
                    </LUIAccordion>
                  )}
                </div>
              </LUITab>
            )
          })}
        </LUITabs>
      )}
    </div>
  )
}
