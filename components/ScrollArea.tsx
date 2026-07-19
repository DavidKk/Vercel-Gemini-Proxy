'use client'

/**
 * Scroll container with hidden native scrollbar and a 2px position indicator (non-draggable).
 * Follows ui-interaction-skills Options Panel Scroll / scroll-overflow guidance.
 */
import { forwardRef, type HTMLAttributes, type ReactNode, type UIEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/** Width of the faux scrollbar track in CSS pixels */
const INDICATOR_TRACK_PX = 2

/** Minimum thumb height when content overflows */
const MIN_THUMB_PX = 2

type ScrollAreaProps = {
  children: ReactNode
  /** Classes on the outer relative wrapper */
  className?: string
  /** Classes on the scroll container */
  scrollClassName?: string
  /** Extra attributes for the scroll container */
  scrollProps?: Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'children' | 'ref' | 'style'>
}

type ThumbState = { top: number; height: number }

function thumbsEqual(a: ThumbState | null, b: ThumbState | null): boolean {
  if (a === null && b === null) {
    return true
  }
  if (a === null || b === null) {
    return false
  }
  return a.top === b.top && a.height === b.height
}

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea(props, forwardedRef) {
  const { children, className, scrollClassName, scrollProps } = props
  const { onScroll: userOnScroll, ...restScrollProps } = scrollProps ?? {}

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
    const { scrollHeight, clientHeight, scrollTop } = el
    if (scrollHeight <= clientHeight) {
      commitThumb(null)
      return
    }
    const thumbHeight = Math.max(MIN_THUMB_PX, Math.round((clientHeight / scrollHeight) * clientHeight))
    const maxScroll = scrollHeight - clientHeight
    const thumbTop = maxScroll <= 0 ? 0 : Math.round((scrollTop / maxScroll) * Math.max(0, clientHeight - thumbHeight))
    commitThumb({ top: thumbTop, height: thumbHeight })
  }, [commitThumb])

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

  const wrapperClass = ['relative flex min-h-0 flex-col overflow-hidden', className].filter(Boolean).join(' ')
  // flex-1 + min-h-0 keeps this viewport inside the parent bound so overflow scrolls here.
  const scrollClass = ['custom-scroll min-h-0 flex-1 overflow-auto', scrollClassName].filter(Boolean).join(' ')

  return (
    <div className={wrapperClass}>
      <div ref={setScrollElement} {...restScrollProps} onScroll={handleScroll} className={scrollClass}>
        {children}
      </div>
      {thumb ? (
        <div className="pointer-events-none absolute bottom-0 right-0.5 top-0 z-10" style={{ width: INDICATOR_TRACK_PX }} aria-hidden>
          <div className="absolute left-0 rounded-full bg-border" style={{ width: INDICATOR_TRACK_PX, height: thumb.height, top: thumb.top }} />
        </div>
      ) : null}
    </div>
  )
})

ScrollArea.displayName = 'ScrollArea'
