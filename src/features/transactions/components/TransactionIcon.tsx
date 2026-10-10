import { CategoryIcon } from '@/features/categories/components/CategoryIcon'
import type { TxRow } from '../transaction.labels'

interface TransactionIconProps {
  row: Pick<TxRow, 'icon' | 'color'>
  /** Diameter in px. */
  size?: number
}

/**
 * The badge a row leads with: the category's icon in its color, or the same
 * badge in neutral gray for transfers and entries whose category is gone.
 */
export const TransactionIcon = ({ row, size = 40 }: TransactionIconProps) => (
  <CategoryIcon category={{ icon: row.icon, color: row.color ?? '#646663' }} size={size} />
)
