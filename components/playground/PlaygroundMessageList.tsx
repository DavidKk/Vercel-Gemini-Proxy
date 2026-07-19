'use client'

import { useEffect, useMemo, useRef } from 'react'

import { BrandLogo } from '@/components/BrandLogo'
import type { PlaygroundMessage } from '@/lib/playground/types'

import { ChatMessagesSkeleton } from './PlaygroundSkeletons'

type PlaygroundMessageListProps = {
  messages: PlaygroundMessage[]
  streaming?: boolean
  /** True while reading localStorage — show skeleton instead of empty state. */
  loading?: boolean
  registerSegment?: (segmentId: string, element: HTMLElement | null) => void
}

type TurnBlock = {
  segmentId: string
  messages: PlaygroundMessage[]
}

function groupMessagesIntoTurns(messages: PlaygroundMessage[]): TurnBlock[] {
  const blocks: TurnBlock[] = []
  let current: TurnBlock | null = null

  for (const message of messages) {
    if (message.role === 'user') {
      if (current) {
        blocks.push(current)
      }
      current = { segmentId: message.id, messages: [message] }
      continue
    }

    if (!current) {
      blocks.push({ segmentId: message.id, messages: [message] })
      continue
    }

    current.messages.push(message)
  }

  if (current) {
    blocks.push(current)
  }

  return blocks
}

function TurnAnchor(props: { segmentId: string; registerSegment?: (segmentId: string, element: HTMLElement | null) => void; children: React.ReactNode }) {
  const { segmentId, registerSegment, children } = props
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    registerSegment?.(segmentId, ref.current)
    return () => registerSegment?.(segmentId, null)
  }, [registerSegment, segmentId])

  return (
    <div ref={ref} data-segment-id={segmentId} className="scroll-mt-4">
      {children}
    </div>
  )
}

function MessageBubble(props: { message: PlaygroundMessage; streaming: boolean; isLast: boolean }) {
  const { message, streaming, isLast } = props
  const showThinking = streaming && isLast && message.role === 'assistant' && !message.content.trim()
  const sources = message.sources?.filter((source) => source.uri) ?? []

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[min(100%,42rem)] space-y-2 rounded-md bg-black/[0.04] px-4 py-2.5 text-[15px] leading-relaxed text-primary">
          {message.image ? <img src={message.image.dataUrl} alt="Uploaded" className="max-h-64 max-w-full rounded-2xl object-contain" /> : null}
          {message.content ? <div className="whitespace-pre-wrap">{message.content}</div> : null}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[min(100%,48rem)] space-y-3 text-[15px] leading-relaxed text-primary">
        <div className="whitespace-pre-wrap">
          {showThinking ? (
            <span className="inline-flex items-center gap-2 text-muted">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
              Thinking… request in progress
            </span>
          ) : message.content ? (
            message.content
          ) : (
            <span className="text-muted">…</span>
          )}
        </div>
        {sources.length > 0 ? (
          <div className="border-t border-border/70 pt-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Sources</p>
            <ul className="mt-1.5 space-y-1">
              {sources.map((source) => (
                <li key={source.uri} className="truncate text-xs">
                  <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-hover hover:underline">
                    {source.title || source.uri}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function PlaygroundMessageList(props: PlaygroundMessageListProps) {
  const { messages, streaming = false, loading = false, registerSegment } = props

  const turns = useMemo(() => groupMessagesIntoTurns(messages), [messages])
  const lastMessageId = messages[messages.length - 1]?.id

  if (loading) {
    return <ChatMessagesSkeleton />
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        <BrandLogo size={56} className="shadow-sm ring-1 ring-border/60" />
        <h2 className="font-display text-base font-semibold tracking-tight text-primary">Start a conversation</h2>
        <p className="max-w-sm text-sm text-muted">Set your API key in Settings, Refresh models, then send a message to exercise the proxy stream.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-3 py-5 md:px-4">
      {turns.map((turn) => (
        <TurnAnchor key={turn.segmentId} segmentId={turn.segmentId} registerSegment={registerSegment}>
          <div className="flex flex-col gap-8">
            {turn.messages.map((message) => (
              <MessageBubble key={message.id} message={message} streaming={streaming} isLast={message.id === lastMessageId} />
            ))}
          </div>
        </TurnAnchor>
      ))}
    </div>
  )
}
