import { LUIButton, LUIIcon, LUIMenu } from '@lumen-ui/react'
import type { ICategory } from '../category.types'
import { CategoryIcon } from './CategoryIcon'
import './CategoryRow.scss'

interface CategoryRowProps {
  category: ICategory
  onEdit?: () => void
  onArchive?: () => void
  onRestore?: () => void
  onDelete?: () => void
}

/**
 * One category on the Categories page: its icon and name, and a menu with its
 * actions. Tapping an active category's name edits it; an archived one only
 * offers restore and delete.
 */
export const CategoryRow = ({
  category,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: CategoryRowProps) => {
  const menuTrigger = (
    <LUIButton variant="ghost" size="lg" rounded aria-label={`Actions for ${category.name}`}>
      <LUIIcon name="more" color="inherit" />
    </LUIButton>
  )

  return (
    <div className="category-row">
      <CategoryIcon category={category} />

      {category.archived ? (
        <div className="category-row__text">
          <span className="category-row__name text-ellipsis">{category.name}</span>
        </div>
      ) : (
        <button type="button" className="category-row__text category-row__edit" onClick={onEdit}>
          <span className="category-row__name text-ellipsis">
            <span className="visually-hidden">Edit </span>
            {category.name}
          </span>
        </button>
      )}

      <LUIMenu mode="right" closeOnItemClick appendBody dropdownDisplay={menuTrigger}>
        {category.archived ? (
          <button type="button" className="dropdown-item category-row__item" onClick={onRestore}>
            <LUIIcon name="undo" size={18} />
            Restore
          </button>
        ) : (
          <>
            <button type="button" className="dropdown-item category-row__item" onClick={onEdit}>
              <LUIIcon name="edit" size={18} />
              Edit
            </button>
            <button type="button" className="dropdown-item category-row__item" onClick={onArchive}>
              <LUIIcon name="box" size={18} />
              Archive
            </button>
          </>
        )}
        <button
          type="button"
          className="dropdown-item category-row__item category-row__item--danger"
          onClick={onDelete}
        >
          <LUIIcon name="trash" size={18} color="inherit" />
          Delete
        </button>
      </LUIMenu>
    </div>
  )
}
