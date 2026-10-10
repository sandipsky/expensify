import type { CSSProperties } from 'react'
import { LUIIcon } from '@lumen-ui/react'
import { dataColor } from '@/utils'
import type { ICategory } from '../category.types'
import './CategoryIcon.scss'

interface CategoryIconProps {
  category: Pick<ICategory, 'icon' | 'color'>
  /** Diameter in px. */
  size?: number
}

/** The category's icon in its color, on a light tint of that color. */
export const CategoryIcon = ({ category, size = 40 }: CategoryIconProps) => {
  const color = dataColor(category.color)
  const style = {
    '--category-color': color,
    width: size,
    height: size,
  } as CSSProperties
  return (
    <span className="category-icon" style={style} aria-hidden="true">
      <LUIIcon name={category.icon} size={Math.round(size * 0.55)} color={color} />
    </span>
  )
}
