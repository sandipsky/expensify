// Account rules: pure functions shared by the accounts screens and, later, the dashboard.
import type { LUIIconName } from '@lumen-ui/react'
import type { AccountType, IAccount } from './account.types'

/** Icon and hex color written to a new account of each type; there is no picker yet. */
export const ACCOUNT_TYPE_DEFAULTS: Readonly<
  Record<AccountType, { icon: LUIIconName; color: string }>
> = {
  cash: { icon: 'money', color: '#36B37E' },
  bank: { icon: 'bank', color: '#2456E6' },
  credit_card: { icon: 'card', color: '#AB20A9' },
  wallet: { icon: 'wallet', color: '#00B8D9' },
  savings: { icon: 'savings', color: '#FFAB00' },
  loan: { icon: 'moneys', color: '#FF4530' },
  other: { icon: 'wallet_alt', color: '#646663' },
}

/** Credit cards and loans hold money owed, so their balances read as amounts owed. */
export function isLiability(type: AccountType): boolean {
  return type === 'credit_card' || type === 'loan'
}

/**
 * Converts between a stored balance and what the form shows. For cards and loans
 * the form edits the amount owed, which is stored as a negative balance; other
 * types pass through. The conversion is its own inverse.
 */
export function flipForLiability(type: AccountType, value: number): number {
  // `|| 0` keeps -0 out of the stored data.
  return isLiability(type) ? -value || 0 : value
}

/** What a negative balance owes, as a positive amount; 0 when the balance is zero or in credit. */
export function amountOwed(balance: number): number {
  return balance < 0 ? -balance : 0
}

/** Share of a credit card's limit in use, unrounded. Null when the account has no limit. */
export function creditUtilization(
  account: Pick<IAccount, 'currentBalance' | 'creditLimit'>,
): number | null {
  const limit = account.creditLimit
  if (!limit || limit <= 0) return null
  return (amountOwed(account.currentBalance) / limit) * 100
}

/** Sum of the active accounts marked "include in total". */
export function totalBalance(
  accounts: readonly Pick<IAccount, 'currentBalance' | 'includeInTotal' | 'archived'>[],
): number {
  return accounts
    .filter((a) => a.includeInTotal && !a.archived)
    .reduce((sum, a) => sum + a.currentBalance, 0)
}

/**
 * The icon and color an account should carry after a type change. They follow
 * the new type only while they are still the old type's defaults, so a custom
 * choice made elsewhere survives.
 */
export function iconAndColorFor(
  account: Pick<IAccount, 'type' | 'icon' | 'color'> | undefined,
  type: AccountType,
): { icon: LUIIconName; color: string } {
  const after = ACCOUNT_TYPE_DEFAULTS[type]
  if (!account) return after
  const before = ACCOUNT_TYPE_DEFAULTS[account.type]
  return {
    icon: account.icon === before.icon ? after.icon : account.icon,
    color: account.color === before.color ? after.color : account.color,
  }
}
