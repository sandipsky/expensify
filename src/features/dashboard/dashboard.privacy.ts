import { useSyncExternalStore } from 'react'
import { readState, writeState } from '@/features/notifications/device-state'

/** Where this browser keeps privacy mode. */
export const PRIVACY_KEY = 'expensify.dashboard.privacy.v1'

const listeners = new Set<() => void>()

const read = (): boolean => readState<unknown>(PRIVACY_KEY, false) === true

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  // Another tab toggled it.
  const sync = (event: StorageEvent) => {
    if (event.key === PRIVACY_KEY) listener()
  }
  window.addEventListener('storage', sync)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', sync)
  }
}

/**
 * Privacy mode: every amount on the dashboard reads as ••••. Kept in this
 * browser, not the profile, as each device decides who can glance at it;
 * open tabs share it.
 */
export function usePrivacy(): [masked: boolean, toggle: () => void] {
  const masked = useSyncExternalStore(subscribe, read, () => false)
  const toggle = () => {
    writeState(PRIVACY_KEY, !read())
    for (const listener of listeners) listener()
  }
  return [masked, toggle]
}
