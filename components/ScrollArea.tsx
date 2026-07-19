'use client'

/**
 * Scroll container with hidden native scrollbar and a 2px position indicator (non-draggable).
 * Supports vertical (default) and horizontal overflow.
 */
import { forwardRef, type HTMLAttributes, type ReactNode, type UIEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/** Thickness of the faux scrollbar track in CSS pixels */
const INDICATOR_TRACK_PX = 2

/** Minimum thumb size when content overflows */
const MIN_THUMB_PX = 2

type ScrollAreaProps = {
  children: ReactNode
  /** Classes on the outer relative wrapper */
  className?: string
  /** Classes on the scroll container */
  scrollClassName?: string
  /** Extra attributes for the scroll container */
  scrollProps?: Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'children' | 'ref' | 'style'>
  /** Scroll axis for the custom indicator. Default: vertical. */
  orientation?: 'vertical' | 'horizontal'
  /** Classes on the indicator thumb (e.g. `bg-white/25` on dark panels). */
  indicatorClassName?: string
}

type ThumbState = { offset: number; size: number }

function thumbsEqual(a: ThumbState | null, b: ThumbState | null): boolean {
  if (a === null && b === null) {
    return true
  }
  if (a === null || b === null) {
    return false
  }
  return a.offset === b.offset && a.size === b.size
}

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea(props, forwardedRef) {
  const { children, className, scrollClassName, scrollProps, orientation = 'vertical', indicatorClassName = 'bg-border' } = props
  const { onScroll: userOnScroll, ...restScrollProps } = scrollProps ?? {}
  const horizontal = orientation === 'horizontal'

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const lastThumbRef = useRef<ThumbState | null | undefined>(undefined)
  const forwardedRefRef = useRef(forwardedRef)
  forwardedRefRef.current = forwardedRef
  const rafSyncRef = useRef(0)

  const setScrollElement = useCallback((el: HTMLDivElement | null) => {
    scrollRef.current = el
    const ref = forwardedRefRef.current
    if (typeof ref === 'function') {
      ref(el)
    } else if (ref) {
      ref.current = el
    }
  }, [])

  const [thumb, setThumb] = useState<ThumbState | null>(null)

  const commitThumb = useCallback((next: ThumbState | null) => {
    if (lastThumbRef.current !== undefined && thumbsEqual(lastThumbRef.current, next)) {
      return
    }
    lastThumbRef.current = next
    setThumb(next)
  }, [])

  const syncThumb = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      commitThumb(null)
      return
    }

    if (horizontal) {
      const { scrollWidth, clientWidth, scrollLeft } = el
      if (scrollWidth <= clientWidth) {
        commitThumb(null)
        return
      }
      const size = Math.max(MIN_THUMB_PX, Math.round((clientWidth / scrollWidth) * clientWidth))
      const maxScroll = scrollWidth - clientWidth
      const offset = maxScroll <= 0 ? 0 : Math.round((scrollLeft / maxScroll) * Math.max(0, clientWidth - size))
      commitThumb({ offset, size })
      return
    }

    const { scrollHeight, clientHeight, scrollTop } = el
    if (scrollHeight <= clientHeight) {
      commitThumb(null)
      return
    }
    const size = Math.max(MIN_THUMB_PX, Math.round((clientHeight / scrollHeight) * clientHeight))
    const maxScroll = scrollHeight - clientHeight
    const offset = maxScroll <= 0 ? 0 : Math.round((scrollTop / maxScroll) * Math.max(0, clientHeight - size))
    commitThumb({ offset, size })
  }, [commitThumb, horizontal])

  const scheduleSyncThumb = useCallback(() => {
    if (rafSyncRef.current !== 0) {
      return
    }
    rafSyncRef.current = requestAnimationFrame(() => {
      rafSyncRef.current = 0
      syncThumb()
    })
  }, [syncThumb])

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      scheduleSyncThumb()
      userOnScroll?.(event)
    },
    [scheduleSyncThumb, userOnScroll]
  )

  useLayoutEffect(() => {
    syncThumb()
  }, [syncThumb, children])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }

    const ro = new ResizeObserver(() => scheduleSyncThumb())
    ro.observe(el)
    const mo = new MutationObserver(() => scheduleSyncThumb())
    mo.observe(el, { childList: true, subtree: true })

    return () => {
      ro.disconnect()
      mo.disconnect()
      if (rafSyncRef.current !== 0) {
        cancelAnimationFrame(rafSyncRef.current)
        rafSyncRef.current = 0
      }
    }
  }, [scheduleSyncThumb])

  const wrapperClass = [horizontal ? 'relative min-w-0 w-full overflow-hidden' : 'relative flex min-h-0 flex-col overflow-hidden', className].filter(Boolean).join(' ')

  const scrollClass = ['custom-scroll', horizontal ? 'min-w-0 overflow-x-auto overflow-y-hidden' : 'min-h-0 flex-1 overflow-auto', scrollClassName].filter(Boolean).join(' ')

  return (
    <div className={wrapperClass}>
      <div ref={setScrollElement} {...restScrollProps} onScroll={handleScroll} className={scrollClass}>
        {children}
      </div>
      {thumb ? (
        horizontal ? (
          <div className="pointer-events-none absolute bottom-0.5 left-0 right-0 z-10" style={{ height: INDICATOR_TRACK_PX }} aria-hidden>
            <div className={`absolute top-0 rounded-full ${indicatorClassName}`} style={{ height: INDICATOR_TRACK_PX, width: thumb.size, left: thumb.offset }} />
          </div>
        ) : (
          <div className="pointer-events-none absolute bottom-0 right-0.5 top-0 z-10" style={{ width: INDICATOR_TRACK_PX }} aria-hidden>
            <div className={`absolute left-0 rounded-full ${indicatorClassName}`} style={{ width: INDICATOR_TRACK_PX, height: thumb.size, top: thumb.offset }} />
          </div>
        )
      ) : null}
    </div>
  )
})

ScrollArea.displayName = 'ScrollArea'
