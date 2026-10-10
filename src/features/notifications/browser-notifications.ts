import { useEffect, useState } from 'react'

/** The browser's permission for system notifications, or `unsupported` where it has none. */
export type NotificationPermissionState = NotificationPermission | 'unsupported'

export function currentPermission(): NotificationPermissionState {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

/** Asks the browser for permission; resolves to the answer. Only ever from a button press. */
export async function requestPermission(): Promise<NotificationPermissionState> {
  if (typeof Notification === 'undefined') return 'unsupported'
  try {
    await Notification.requestPermission()
  } catch {
    // Older Safari takes a callback instead and rejects the promise form.
  }
  return currentPermission()
}

/**
 * Shows a system notification; false where it can't, so the caller shows a
 * toast instead. `tag` replaces an earlier one with the same tag, so two open
 * tabs show it once.
 */
export function showSystemNotification(
  title: string,
  body: string,
  tag: string,
  onClick: () => void,
): boolean {
  if (currentPermission() !== 'granted') return false
  try {
    const notification = new Notification(title, { body, tag, icon: '/favicon.svg' })
    notification.onclick = () => {
      window.focus()
      onClick()
      notification.close()
    }
    return true
  } catch {
    // Android's Chrome shows notifications only from a service worker.
    return false
  }
}

/**
 * The permission, kept current: the user can change it in the browser's site
 * settings at any time, so it's read again whenever the tab comes back.
 */
export function useNotificationPermission() {
  const [permission, setPermission] = useState(currentPermission)

  useEffect(() => {
    const refresh = () => setPermission(currentPermission())
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  const request = async () => {
    const answer = await requestPermission()
    setPermission(answer)
    return answer
  }

  return { permission, request }
}
