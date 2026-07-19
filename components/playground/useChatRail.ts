'use client'

import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'

export function useChatRail(scrollRef: RefObject<HTMLDivElement | null>, segmentIds: string[]) {
  const segmentElements = useRef(new Map<string, HTMLElement>())
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null)
  const [segmentVersion, setSegmentVersion] = useState(0)

  /** Stable dep key: streaming updates previews without changing ids. */
  const segmentIdsKey = segmentIds.join('\0')

  const registerSegment = useCallback((segmentId: string, element: HTMLElement | null) => {
    const previous = segmentElements.current.get(segmentId) ?? null
    if (element) {
      if (previous === element) {
        return
      }
      segmentElements.current.set(segmentId, element)
    } else {
      if (!previous) {
        return
      }
      segmentElements.current.delete(segmentId)
    }
    setSegmentVersion((current) => current + 1)
  }, [])

  const scrollToSegment = useCallback((segmentId: string) => {
    segmentElements.current.get(segmentId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  useEffect(() => {
    const root = scrollRef.current
    const ids = segmentIdsKey ? segmentIdsKey.split('\0') : []
    if (!root || ids.length === 0) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0]

        const segmentId = visible?.target instanceof HTMLElement ? visible.target.dataset.segmentId : undefined
        if (segmentId) {
          setActiveSegmentId(segmentId)
        }
      },
      { root, threshold: [0.15, 0.4, 0.7] }
    )

    for (const segmentId of ids) {
      const element = segmentElements.current.get(segmentId)
      if (element) {
        observer.observe(element)
      }
    }

    return () => observer.disconnect()
  }, [scrollRef, segmentIdsKey, segmentVersion])

  return { registerSegment, activeSegmentId, scrollToSegment }
}
