'use client'

import type { ReactNode, RefObject } from 'react'

import { ScrollArea } from '@/components/ScrollArea'

type PlaygroundChatShellProps = {
  scrollRef?: RefObject<HTMLDivElement | null>
  children: ReactNode
  /** Left conversation rail beside the message column */
  leftRail?: ReactNode
  footer?: ReactNode
}

export function PlaygroundChatShell(props: PlaygroundChatShellProps) {
  const { scrollRef, children, leftRail, footer } = props

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-canvas">
      <div className="flex min-h-0 flex-1">
        {leftRail ? <div className="flex shrink-0 items-stretch border-r border-transparent pl-1.5 pr-1 md:pl-2 md:pr-1.5">{leftRail}</div> : null}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ScrollArea ref={scrollRef} className="min-h-0 min-w-0 flex-1" scrollClassName="flex min-h-0 flex-1 flex-col">
            {children}
          </ScrollArea>

          {footer ? <div className="shrink-0">{footer}</div> : null}
        </div>
      </div>
    </section>
  )
}
