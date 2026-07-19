'use client'

import { type CSSProperties, type RefObject, useCallback, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import type { ChatRailSegment } from '@/lib/playground/chat-rail'

type RailPreviewCardProps = {
  anchorRef: RefObject<HTMLElement | null>
  segment: ChatRailSegment
}

export function RailPreviewCard(props: RailPreviewCardProps) {
  const { anchorRef, segment } = props
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [style, setStyle] = useState<CSSProperties>({
    position: 'fixed',
    left: 0,
    top: 0,
    visibility: 'hidden',
  })

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current
    const card = cardRef.current
    if (!anchor || !card) {
      return
    }

    const rect = anchor.getBoundingClientRect()
    const cardWidth = card.offsetWidth
    const cardHeight = card.offsetHeight
    const margin = 12
    let left = rect.right + 10
    let top = rect.top + rect.height / 2 - cardHeight / 2

    if (left + cardWidth > window.innerWidth - margin) {
      left = rect.left - cardWidth - 10
    }

    top = Math.max(margin, Math.min(top, window.innerHeight - cardHeight - margin))

    setStyle({ position: 'fixed', left, top, visibility: 'visible' })
  }, [anchorRef])

  useLayoutEffect(() => {
    updatePosition()
    const handleViewportChange = () => updatePosition()
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('scroll', handleViewportChange, true)
    return () => {
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('scroll', handleViewportChange, true)
    }
  }, [segment.assistantPreview, segment.userPreview, updatePosition])

  const assistantText = segment.streaming && !segment.assistantPreview.trim() ? 'Generating…' : segment.assistantPreview

  const card = (
    <div
      ref={cardRef}
      className="pointer-events-none z-[80] w-[min(16rem,calc(100vw-2.5rem))] rounded-md border border-border bg-surface px-3 py-2.5 shadow-composer"
      style={style}
      role="tooltip"
    >
      {segment.userPreview ? <p className="m-0 line-clamp-2 text-xs leading-snug text-primary">{segment.userPreview}</p> : null}
      {assistantText ? <p className={`m-0 line-clamp-3 text-xs leading-snug text-muted ${segment.userPreview ? 'mt-1.5' : ''}`}>{assistantText}</p> : null}
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(card, document.body) : null
}
