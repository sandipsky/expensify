import type { LUIIconName } from '@lumen-ui/react'
import type { FileRouteTypes } from '@/routeTree.gen'

/**
 * Known routes autocomplete; `(string & {})` keeps the union open so nav
 * entries can point at pages that have not been built yet.
 */
export type AppPath = FileRouteTypes['to'] | (string & {})

export interface SidebarNavLeaf {
  label: string
  to: AppPath
  icon?: LUIIconName
  exact?: boolean
}

export interface SidebarNavGroup {
  label: string
  icon?: LUIIconName
  children: SidebarNavLeaf[]
}

export type SidebarNavItem = SidebarNavLeaf | SidebarNavGroup

export const isSidebarNavGroup = (item: SidebarNavItem): item is SidebarNavGroup =>
  'children' in item

export const SIDEBAR_ITEMS: SidebarNavItem[] = [
  { label: 'Dashboard', to: '/', icon: 'dashboard', exact: true },
  { label: 'Transactions', to: '/transactions', icon: 'receipt' },
  { label: 'Accounts', to: '/accounts', icon: 'wallet' },
  { label: 'Budgets', to: '/budgets', icon: 'donut_large' },
  { label: 'Reports', to: '/reports', icon: 'bar_chart' },
  { label: 'Recurring', to: '/recurring', icon: 'event_repeat' },
  { label: 'Categories', to: '/categories', icon: 'category' },
  { label: 'Settings', to: '/settings', icon: 'settings' },
]
