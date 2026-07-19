'use client'

import type { ReactNode } from 'react'

import { ScrollArea } from '@/components/ScrollArea'

type PageScrollFrameProps = {
  /** Optional fixed top chrome (header). */
  header?: ReactNode
  children: ReactNode
  /** Extra class on the outer frame */
  className?: string
}

/**
 * Full-viewport frame: header stays put, body scrolls via custom ScrollArea (no native page bar).
 */
export function PageScrollFrame(props: PageScrollFrameProps) {
  const { header, children, className = '' } = props

  return (
    <div className={`flex h-full min-h-0 w-full flex-col overflow-hidden bg-canvas ${className}`.trim()}>
      {header ? <div className="w-full shrink-0">{header}</div> : null}
      <ScrollArea className="min-h-0 w-full flex-1" scrollClassName="w-full">
        {children}
      </ScrollArea>
    </div>
  )
}
