import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  LUIButton,
  LUISegmentedControl,
  LUITextInput,
  useLUINotification,
} from '@lumen-ui/react'
import { IconPicker, type IconOption } from '@/components/icon-picker'
import type { SheetHandle } from '@/components/sheet'
import { getApiErrorMessage } from '@/lib'
import {
  DEFAULT_CATEGORY_ICON,
  MAX_CATEGORY_NAME,
  isNameTaken,
  randomColor,
} from '../category.domain'
import {
  CATEGORY_TYPE_LABELS,
  CATEGORY_TYPE_OPTIONS,
  ICON_OPTIONS,
  NAME_PLACEHOLDERS,
} from '../category.labels'
import { useCategories, useCreateCategory, useUpdateCategory } from '../category.query'
import {
  CATEGORY_TYPES,
  type CategoryType,
  type ICategory,
  type ICategoryBody,
} from '../category.types'

interface CategoryFormProps {
  /** The category to edit; omit to add one. */
  category?: ICategory
  /** Adding: the list it goes in. */
  type?: CategoryType
  /** The sheet this form opened in; closed with the saved category's id. */
  sheet: SheetHandle<number>
}

/** Names are unique per type, ignoring case, so the schema needs the other categories. */
const categorySchema = (categories: readonly ICategory[], exceptId?: number) =>
  z
    .object({
      type: z.enum(CATEGORY_TYPES),
      name: z
        .string()
        .trim()
        .min(1, 'Name is required')
        .max(MAX_CATEGORY_NAME, `Use at most ${MAX_CATEGORY_NAME} characters`),
      icon: z.string().min(1, 'Pick an icon'),
    })
    .superRefine((values, ctx) => {
      if (isNameTaken(categories, { name: values.name, type: values.type, id: exceptId })) {
        const label = CATEGORY_TYPE_LABELS[values.type].toLowerCase()
        ctx.addIssue({
          code: 'custom',
          path: ['name'],
          message: `You already have an ${label} category with this name.`,
        })
      }
    })

type CategoryFormValues = z.infer<ReturnType<typeof categorySchema>>

/** The picker's tiles, plus the current icon first when it isn't one of them, so it stays picked. */
const iconOptionsFor = (category?: ICategory): readonly IconOption[] =>
  category && !ICON_OPTIONS.some((o) => o.value === category.icon)
    ? [{ value: category.icon, label: category.icon.replaceAll('_', ' ') }, ...ICON_OPTIONS]
    : ICON_OPTIONS

/**
 * Add or edit a category, in a sheet: type, name and icon. The type is chosen
 * only when adding; after that it's fixed, since entries of that type use it.
 * There is no color picker: a new category gets a random palette color, which
 * it keeps.
 */
export const CategoryForm = ({ category, type = 'expense', sheet }: CategoryFormProps) => {
  const notify = useLUINotification()
  const { data } = useCategories()
  const categories = data ?? []
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()

  // Picked once, when the form opens, so the icon preview shows the color the category will get.
  const [color] = useState(() => category?.color ?? randomColor(categories, type))
  const iconOptions = iconOptionsFor(category)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema(categories, category?.id)),
    defaultValues: category
      ? { type: category.type, name: category.name, icon: category.icon }
      : { type, name: '', icon: DEFAULT_CATEGORY_ICON },
  })

  const currentType = useWatch({ control, name: 'type' })

  const onSubmit = (values: CategoryFormValues) => {
    const body: ICategoryBody = {
      name: values.name,
      type: values.type,
      icon: values.icon,
      color,
    }

    if (category) {
      updateCategory.mutate(
        { id: category.id, body },
        {
          onSuccess: (saved) => {
            notify.success('Category updated', saved.name)
            sheet.close(saved.id)
          },
        },
      )
    } else {
      createCategory.mutate(body, {
        onSuccess: (saved) => {
          notify.success('Category added', saved.name)
          sheet.close(saved.id)
        },
      })
    }
  }

  const saving = createCategory.isPending || updateCategory.isPending
  const saveError = createCategory.error ?? updateCategory.error

  return (
    <form className="sheet-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <h2 className="sheet-form__title">{category ? 'Edit category' : 'Add category'}</h2>

      <div className="sheet-form__fields">
        {!category && (
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <LUISegmentedControl
                options={CATEGORY_TYPE_OPTIONS}
                size="lg"
                fullWidth
                value={field.value}
                onChange={(value) => field.onChange(value as CategoryType)}
              />
            )}
          />
        )}

        <LUITextInput
          label="Name"
          placeholder={NAME_PLACEHOLDERS[currentType]}
          autoFocus
          error={errors.name?.message}
          {...register('name')}
        />

        <Controller
          control={control}
          name="icon"
          render={({ field }) => (
            <IconPicker
              label="Icon"
              name="icon"
              options={iconOptions}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              color={color}
            />
          )}
        />
        {errors.icon && <div className="alert error">{errors.icon.message}</div>}

        {saveError && <div className="alert error">{getApiErrorMessage(saveError)}</div>}
      </div>

      <div className="sheet-form__actions">
        <LUIButton variant="outlined" size="lg" onClick={() => sheet.close()}>
          Cancel
        </LUIButton>
        <LUIButton size="lg" type="submit" disabled={saving}>
          {saving ? 'Saving...' : category ? 'Save' : 'Add category'}
        </LUIButton>
      </div>
    </form>
  )
}
