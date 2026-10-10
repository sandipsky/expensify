import type { CSSProperties } from 'react'
import { LUIIcon } from '@lumen-ui/react'
import { dataColor } from '@/utils'
import type { IAccount } from '../account.types'
import './AccountIcon.scss'

interface AccountIconProps {
  account: Pick<IAccount, 'icon' | 'color'>
  /** Diameter in px. */
  size?: number
}

export const AccountIcon = ({ account, size = 40 }: AccountIconProps) => {
  const color = dataColor(account.color)
  const style = {
    '--account-color': color,
    width: size,
    height: size,
  } as CSSProperties
  return (
    <span className="account-icon" style={style} aria-hidden="true">
      <LUIIcon name={account.icon} size={Math.round(size * 0.55)} color={color} />
    </span>
  )
}
