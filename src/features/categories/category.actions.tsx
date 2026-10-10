import type { ComponentProps } from 'react'
import { LUIConfirmDialog, useLUIModal, useLUINotification } from '@lumen-ui/react'
import { useSheet } from '@/components/sheet'
import { getErrorMessage } from '@/lib'
import {
  useAddDefaultCategories,
  useDeleteCategory,
  useSetCategoryArchived,
} from './category.query'
import type { CategoryType, ICategory } from './category.types'
import { CategoryForm } from './components/CategoryForm'

type ConfirmData = ComponentProps<typeof LUIConfirmDialog>['data']

/** Wide enough for eight icon tiles a row. */
const FORM_WIDTH = '560px'

/**
 * The categories screen's user flows: forms in sheets, confirmations and
 * toasts. The rows and the empty states share it, so every entry point
 * behaves the same.
 */
export function useCategoryActions() {
  const sheet = useSheet()
  const modal = useLUIModal()
  const notify = useLUINotification()
  const setArchived = useSetCategoryArchived()
  const remove = useDeleteCategory()
  const addDefaultCategories = useAddDefaultCategories()

  const confirm = (data: ConfirmData) =>
    modal
      .open<boolean>((ref) => <LUIConfirmDialog modalRef={ref} data={data} />, { width: '440px' })
      .afterClosed()

  // A write behind a dialog's confirm button: a failure is reported and
  // rethrown, so the dialog stays open for another try.
  const attempt = async <T,>(action: () => Promise<T>, failure: string): Promise<T> => {
    try {
      return await action()
    } catch (error) {
      notify.error(failure, getErrorMessage(error))
      throw error
    }
  }

  /**
   * Opens the add form for the type's list. Resolves to the new category's
   * id, or `undefined` if cancelled.
   */
  const create = (type: CategoryType) =>
    sheet.open<string>((handle) => <CategoryForm type={type} sheet={handle} />, {
      width: FORM_WIDTH,
    })

  const edit = (category: ICategory) =>
    sheet.open<string>((handle) => <CategoryForm category={category} sheet={handle} />, {
      width: FORM_WIDTH,
    })

  /** Adds the usual categories for someone starting with an empty list. */
  const addDefaults = async () => {
    const added = await attempt(
      () => addDefaultCategories.mutateAsync(),
      'Could not add default categories',
    ).then(
      (list) => list.length,
      () => null,
    )
    if (added === null) return
    if (added) {
      notify.success(
        'Default categories added',
        "Rename them, pick other icons or archive the ones you don't need.",
      )
    } else {
      notify.info('Nothing to add', 'You already have every default category.')
    }
  }

  /** Archives at once: the category leaves pickers, and entries that use it keep it. */
  const archive = async (category: ICategory) => {
    const archived = await attempt(
      () => setArchived.mutateAsync({ id: category.id, archived: true }),
      'Could not archive category',
    ).then(
      () => true,
      () => false,
    )
    if (archived) notify.success('Category archived', `${category.name} is hidden from pickers.`)
  }

  const restore = async (category: ICategory) => {
    const restored = await attempt(
      () => setArchived.mutateAsync({ id: category.id, archived: false }),
      'Could not restore category',
    ).then(
      () => true,
      () => false,
    )
    if (restored) notify.success('Category restored', category.name)
  }

  /** Asks first, since a delete can't be undone. Resolves to whether the category was deleted. */
  const deleteCategory = async (category: ICategory): Promise<boolean> => {
    const confirmed = await confirm({
      title: `Delete ${category.name}?`,
      message:
        "This can't be undone. Archive it instead if you'd rather hide it from pickers " +
        'and keep it.',
      confirmText: 'Delete category',
      confirmVariant: 'danger',
      onConfirm: () => attempt(() => remove.mutateAsync(category.id), 'Could not delete category'),
    })
    if (confirmed) notify.success('Category deleted', category.name)
    return !!confirmed
  }

  return { create, edit, addDefaults, archive, restore, delete: deleteCategory }
}
