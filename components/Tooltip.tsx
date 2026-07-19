'use client'

import type { CSSProperties, ReactElement } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const GAP = 6
const PADDING = 8

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

type TooltipProps = {
  /** Short hint only — no interactive content inside the tooltip. */
  content: string
  /** Preferred edge; bottom flips to top when clipped. */
  placement?: TooltipPlacement
  children: ReactElement
}

/**
 * Viewport-safe tooltip (floating-layer): portal, flip/shift with padding,
 * open on hover/focus, close on leave/blur/Escape.
 */
export function Tooltip(props: TooltipProps) {
  const { content, children, placement: preferredPlacement = 'bottom' } = props
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [style, setStyle] = useState<CSSProperties>({
    position: 'fixed',
    left: 0,
    top: 0,
    visibility: 'hidden',
  })
  const triggerRef = useRef<HTMLSpanElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !tooltipRef.current) {
      return
    }

    const updatePosition = () => {
      const trigger = triggerRef.current
      const tooltip = tooltipRef.current
      if (!trigger || !tooltip) {
        return
      }

      const rect = trigger.getBoundingClientRect()
      const tw = tooltip.offsetWidth
      const th = tooltip.offsetHeight
      const vw = window.innerWidth
      const vh = window.innerHeight

      let left: number
      let top: number

      if (preferredPlacement === 'right') {
        left = Math.min(Math.max(PADDING, rect.right + GAP), vw - tw - PADDING)
        top = Math.max(PADDING, Math.min(vh - th - PADDING, rect.top + rect.height / 2 - th / 2))
      } else if (preferredPlacement === 'left') {
        left = Math.max(PADDING, rect.left - GAP - tw)
        top = Math.max(PADDING, Math.min(vh - th - PADDING, rect.top + rect.height / 2 - th / 2))
      } else if (preferredPlacement === 'top') {
        top = Math.max(PADDING, rect.top - GAP - th)
        left = Math.max(PADDING, Math.min(vw - tw - PADDING, rect.left + rect.width / 2 - tw / 2))
      } else {
        const preferBottom = rect.bottom + GAP + th <= vh - PADDING
        if (preferBottom) {
          top = rect.bottom + GAP
        } else {
          const topPlace = rect.top - GAP - th
          top = topPlace >= PADDING ? topPlace : PADDING
        }
        left = Math.max(PADDING, Math.min(vw - tw - PADDING, rect.left + rect.width / 2 - tw / 2))
      }

      setStyle({ left, top, position: 'fixed', visibility: 'visible' })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, preferredPlacement, content])

  const tooltipEl = open ? (
    <div
      ref={tooltipRef}
      role="tooltip"
      className="pointer-events-none z-[9999] max-w-[min(calc(100vw-16px),14rem)] rounded-md border border-white/10 bg-panel px-2.5 py-1.5 text-xs text-panel-fg shadow-composer whitespace-normal"
      style={style}
    >
      {content}
    </div>
  ) : null

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex items-center"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </span>
      {mounted && tooltipEl ? createPortal(tooltipEl, document.body) : null}
    </>
  )
}
