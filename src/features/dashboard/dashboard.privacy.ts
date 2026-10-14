import { useState } from 'react'

/**
 * Privacy mode: every amount on the dashboard reads as ••••. It starts on
 * each time the dashboard opens, so amounts show only when asked for, and
 * lasts until the user leaves the page.
 */
export function usePrivacy(): [masked: boolean, toggle: () => void] {
  const [masked, setMasked] = useState(true)
  const toggle = () => setMasked((was) => !was)
  return [masked, toggle]
}
