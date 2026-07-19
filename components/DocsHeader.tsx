'use client'

import Link from 'next/link'

import { BrandLogo } from '@/components/BrandLogo'
import { McpHeaderButton } from '@/components/McpDialog'
import { Tooltip } from '@/components/Tooltip'

const GITHUB_REPO = 'https://github.com/DavidKk/Vercel-Gemini-Proxy'

/** Same chrome as Playground / Settings: logo → home, title plain text. */
export function DocsHeader() {
  return (
    <header className="flex h-14 w-full shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-2.5">
        <Link href="/" aria-label="Home" className="shrink-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
          <BrandLogo size={28} className="shadow-sm ring-1 ring-border/60" />
        </Link>
        <div className="min-w-0 leading-tight">
          <p className="font-display text-sm font-semibold tracking-tight text-primary">API guide</p>
          <p className="text-[11px] text-muted">Deploy · env · endpoints</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <McpHeaderButton />
        <Tooltip content="Playground" placement="bottom">
          <Link href="/chat" aria-label="Playground" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-subtle hover:bg-canvas">
            <ChatIcon />
          </Link>
        </Tooltip>
        <Tooltip content="GitHub" placement="bottom">
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-subtle hover:bg-canvas"
          >
            <GitHubIcon />
          </a>
        </Tooltip>
      </div>
    </header>
  )
}

function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6A2.5 2.5 0 0 1 16.5 15H12l-4 3.5V15H7.5A2.5 2.5 0 0 1 5 12.5v-6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.586 2 12.253c0 4.537 2.865 8.382 6.839 9.74.5.094.682-.222.682-.493 0-.243-.01-1.052-.014-1.91-2.782.618-3.37-1.21-3.37-1.21-.455-1.18-1.11-1.494-1.11-1.494-.908-.635.069-.622.069-.622 1.004.072 1.532 1.056 1.532 1.056.892 1.56 2.341 1.11 2.91.849.091-.66.35-1.11.636-1.366-2.22-.258-4.555-1.137-4.555-5.06 0-1.118.39-2.033 1.029-2.75-.103-.259-.446-1.3.098-2.71 0 0 .84-.274 2.75 1.05A9.35 9.35 0 0 1 12 7.06c.85.004 1.705.117 2.504.344 1.909-1.324 2.747-1.05 2.747-1.05.546 1.41.203 2.451.1 2.71.64.717 1.028 1.632 1.028 2.75 0 3.933-2.338 4.798-4.566 5.052.359.317.679.942.679 1.9 0 1.372-.012 2.477-.012 2.814 0 .274.18.593.688.492C19.138 20.63 22 16.787 22 12.253 22 6.586 17.523 2 12 2Z" />
    </svg>
  )
}
