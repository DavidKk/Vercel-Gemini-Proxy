'use client'

import { ScrollArea } from '@/components/ScrollArea'

type CodeBlockProps = {
  children: string
  /** Optional header label (e.g. curl, .env) */
  label?: string
  /** Skip outer margin/border shell (e.g. nested under endpoint chrome) */
  bare?: boolean
  /** Light canvas style for homepage; default is dark panel */
  tone?: 'panel' | 'canvas'
  className?: string
}

/** Monospace code sample with horizontal custom ScrollArea (no native scrollbar). */
export function CodeBlock(props: CodeBlockProps) {
  const { children, label, bare = false, tone = 'panel', className = '' } = props
  const dark = tone === 'panel'

  const shell = bare
    ? className
    : [dark ? 'mt-4 overflow-hidden rounded-md border border-white/10' : 'mt-3 overflow-hidden rounded-md border border-border', className].filter(Boolean).join(' ')

  return (
    <div className={`min-w-0 w-full ${shell || ''}`.trim() || undefined}>
      {label ? (
        <div className={`flex items-center justify-between border-b px-3 py-1.5 ${dark ? 'border-white/10 bg-panel' : 'border-border bg-surface'}`}>
          <span className={`font-mono text-[10px] uppercase tracking-[0.14em] ${dark ? 'text-panel-muted' : 'text-muted'}`}>{label}</span>
        </div>
      ) : null}
      <ScrollArea
        orientation="horizontal"
        indicatorClassName={dark ? 'bg-white/30' : 'bg-border'}
        className={`min-w-0 w-full ${dark ? 'bg-panel' : 'bg-canvas'}`}
        scrollClassName="px-3 py-3"
      >
        <pre className={`m-0 w-max min-w-full whitespace-pre font-mono text-[12px] leading-relaxed ${dark ? 'text-panel-fg' : 'text-primary text-xs'}`}>{children}</pre>
      </ScrollArea>
    </div>
  )
}
