'use client'

import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

export type ConfirmDialogProps = {
  open: boolean
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** Destructive confirm styling (e.g. Clear / Delete). */
  destructive?: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Custom confirm dialog (portal): Escape / backdrop cancel, focus trap, role=alertdialog.
 * Destructive dialogs focus Cancel first to avoid accidental confirm.
 */
export function ConfirmDialog(props: ConfirmDialogProps) {
  const { open, title = 'Confirm', message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive = false, onCancel, onConfirm } = props

  const titleId = useId()
  const messageId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const initial = destructive ? cancelRef.current : confirmRef.current
    initial?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const panel = panelRef.current
      if (!panel) {
        return
      }

      const focusable = [cancelRef.current, confirmRef.current].filter((node): node is HTMLButtonElement => Boolean(node))
      if (focusable.length === 0) {
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey) {
        if (active === first || !panel.contains(active)) {
          event.preventDefault()
          last.focus()
        }
        return
      }

      if (active === last || !panel.contains(active)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [open, onCancel, destructive])

  if (!open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      <button type="button" aria-label="Close dialog" className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="relative w-full max-w-sm border border-border bg-surface p-5 shadow-composer"
      >
        <h2 id={titleId} className="font-display text-sm font-semibold tracking-tight text-primary">
          {title}
        </h2>
        <p id={messageId} className="mt-2 text-sm leading-snug text-muted">
          {message}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-subtle hover:bg-canvas"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={
              destructive
                ? 'rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700'
                : 'rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-hover'
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
