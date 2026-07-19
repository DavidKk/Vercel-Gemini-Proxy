'use client'

import { useRef, useState } from 'react'

import { ScrollArea } from '@/components/ScrollArea'
import { type ChatRailSegment, resolveRailBarWidthPercent } from '@/lib/playground/chat-rail'

import { RailPreviewCard } from './RailPreviewCard'

type ConversationRailProps = {
  segments: ChatRailSegment[]
  activeSegmentId?: string | null
  onSelect?: (segmentId: string) => void
}

/** idle / stretch caps (px); content length drives idle width. */
const RAIL_IDLE_MIN_PX = 8
const RAIL_IDLE_MAX_PX = 12
const RAIL_HOVER_MAX_PX = 22
/** fisheye: farther ticks stretch less (gaussian falloff). */
const RAIL_FISHEYE_SIGMA = 1.2

function fisheyeFalloff(distance: number): number {
  return Math.exp(-(distance * distance) / (2 * RAIL_FISHEYE_SIGMA * RAIL_FISHEYE_SIGMA))
}

function resolveIdleWidthPx(segment: ChatRailSegment): number {
  const percent = resolveRailBarWidthPercent(segment.userPreview, segment.assistantPreview)
  return RAIL_IDLE_MIN_PX + ((RAIL_IDLE_MAX_PX - RAIL_IDLE_MIN_PX) * percent) / 100
}

function resolveTickWidthPx(segment: ChatRailSegment, stretch: number, active: boolean): number {
  const idle = resolveIdleWidthPx(segment)
  const activeBoost = active && stretch <= 0 ? 2 : 0
  if (stretch <= 0) {
    return idle + activeBoost
  }
  return idle + (RAIL_HOVER_MAX_PX - idle) * stretch
}

/** Codex-style left conversation rail: 1px ticks; hover stretches right with fisheye. */
export function ConversationRail(props: ConversationRailProps) {
  const { segments, activeSegmentId = null, onSelect } = props
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  if (segments.length === 0) {
    return null
  }

  return (
    <ScrollArea
      className="h-full min-h-0 w-[1.625rem] shrink-0 md:w-8"
      scrollClassName="flex h-full min-h-0 flex-col items-stretch overscroll-contain pl-1.5"
      scrollProps={{
        'aria-label': 'Conversation rail',
        onMouseLeave: () => setHoverIndex(null),
      }}
    >
      <div className="my-auto flex w-full flex-col items-stretch gap-2.5 py-3">
        {segments.map((segment, index) => {
          const stretch = hoverIndex === null ? 0 : fisheyeFalloff(Math.abs(index - hoverIndex))
          return (
            <ConversationRailTick
              key={segment.id}
              segment={segment}
              active={activeSegmentId === segment.id}
              stretch={stretch}
              showPreview={hoverIndex === index}
              onHover={() => setHoverIndex(index)}
              onSelect={onSelect}
            />
          )
        })}
      </div>
    </ScrollArea>
  )
}

function ConversationRailTick(props: {
  segment: ChatRailSegment
  active: boolean
  stretch: number
  showPreview: boolean
  onHover: () => void
  onSelect?: (segmentId: string) => void
}) {
  const { segment, active, stretch, showPreview, onHover, onSelect } = props
  const barRef = useRef<HTMLButtonElement | null>(null)
  const widthPx = resolveTickWidthPx(segment, stretch, active)
  const emphasized = stretch > 0.85 || active

  return (
    <div className="relative flex h-3 w-full items-center justify-start" onMouseEnter={onHover} onFocus={onHover}>
      <button
        ref={barRef}
        type="button"
        aria-label="Jump to this turn"
        aria-current={active ? 'true' : undefined}
        className={`h-px origin-left rounded-full transition-[width,background-color,opacity] duration-150 ease-out ${
          emphasized ? 'bg-primary' : stretch > 0.15 ? 'bg-subtle' : 'bg-border'
        }`}
        style={{ width: widthPx }}
        onClick={() => onSelect?.(segment.id)}
      />
      {showPreview ? <RailPreviewCard anchorRef={barRef} segment={segment} /> : null}
    </div>
  )
}
