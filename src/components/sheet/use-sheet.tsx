import type { ReactNode } from 'react'
import { useLUIDrawer, useLUIModal } from '@lumen-ui/react'
import { useMediaQuery } from './use-media-query'

/** Phones get a bottom sheet, tablets and desktops a dialog. */
const PHONE = '(max-width: 599.98px)'

/** What a form opened by `useSheet` gets: a `close()` for whichever container holds it. */
export interface SheetHandle<R = unknown> {
  close(result?: R): void
}

export interface SheetOptions {
  /** Dialog width on tablets and desktops. Default 480px. */
  width?: string
  /** Bottom sheet height on phones. Default: fits the content. */
  phoneHeight?: string
}

/**
 * Opens a form the way the app lays them out: a bottom sheet on phones, a
 * dialog elsewhere. The content closes itself through the handle it receives,
 * and `open` resolves with what it passed to `close()`, or `undefined` when
 * dismissed. Both containers cap their height; see `_sheet-form.scss`.
 *
 * ```tsx
 * const sheet = useSheet()
 * const id = await sheet.open<number>((handle) => <AccountForm sheet={handle} />)
 * ```
 */
export function useSheet() {
  const modals = useLUIModal()
  const drawers = useLUIDrawer()
  const phone = useMediaQuery(PHONE)

  const open = <R = unknown,>(
    render: (sheet: SheetHandle<R>) => ReactNode,
    options: SheetOptions = {},
  ): Promise<R | undefined> => {
    if (phone) {
      return drawers
        .open<R>((ref) => render(ref), {
          position: 'bottom',
          size: options.phoneHeight ?? 'auto',
          panelClass: 'sheet-panel',
        })
        .afterClosed()
    }
    return modals
      .open<R>((ref) => render(ref), {
        width: options.width ?? '480px',
        panelClass: 'sheet-panel',
      })
      .afterClosed()
  }

  return { open }
}
