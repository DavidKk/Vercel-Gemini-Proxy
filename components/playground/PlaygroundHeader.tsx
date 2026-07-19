'use client'

import Link from 'next/link'

import { BrandLogo } from '@/components/BrandLogo'
import { McpHeaderButton } from '@/components/McpDialog'
import { Tooltip } from '@/components/Tooltip'

type ChatHeaderProps = {
  variant: 'chat'
  onClear: () => void
  clearDisabled?: boolean
}

type SettingsHeaderProps = {
  variant: 'settings'
}

type PlaygroundHeaderProps = ChatHeaderProps | SettingsHeaderProps

export function PlaygroundHeader(props: PlaygroundHeaderProps) {
  const headerClass = 'flex h-14 w-full shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur-sm'

  if (props.variant === 'settings') {
    return (
      <header className={headerClass}>
        <div className="flex min-w-0 items-center gap-2.5">
          <Link href="/" aria-label="Home" className="shrink-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            <BrandLogo size={28} className="shadow-sm ring-1 ring-border/60" />
          </Link>
          <div className="min-w-0 leading-tight">
            <h1 className="font-display text-sm font-semibold tracking-tight text-primary">Settings</h1>
            <p className="text-[11px] text-muted">API key · localStorage only</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <McpHeaderButton />
          <Tooltip content="Back to chat" placement="bottom">
            <Link href="/chat" aria-label="Back to chat" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-subtle hover:bg-canvas">
              <CloseIcon />
            </Link>
          </Tooltip>
        </div>
      </header>
    )
  }

  return (
    <header className={headerClass}>
      <div className="flex min-w-0 items-center gap-2.5">
        <Link href="/" aria-label="Home" className="shrink-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
          <BrandLogo size={28} className="shadow-sm ring-1 ring-border/60" />
        </Link>
        <div className="min-w-0 leading-tight">
          <p className="font-display text-sm font-semibold tracking-tight text-primary">Gemini Relay</p>
          <p className="text-[11px] text-muted">Debug proxy · local demo</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <McpHeaderButton />
        <Tooltip content={props.clearDisabled ? 'Nothing to clear' : 'Clear chat'} placement="bottom">
          <button
            type="button"
            onClick={props.onClear}
            disabled={props.clearDisabled}
            aria-label="Clear chat"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-subtle hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ClearIcon />
          </button>
        </Tooltip>
        <Tooltip content="Settings" placement="bottom">
          <Link href="/settings" aria-label="Settings" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-subtle hover:bg-canvas">
            <SettingsIcon />
          </Link>
        </Tooltip>
      </div>
    </header>
  )
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function ClearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.5 7h15M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7m2 0v11.5a1.5 1.5 0 0 1-1.5 1.5h-7a1.5 1.5 0 0 1-1.5-1.5V7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 11v5M14 11v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M19.4 13.5a7.7 7.7 0 0 0 .1-1.5 7.7 7.7 0 0 0-.1-1.5l2-1.5-2-3.5-2.4 1a7.4 7.4 0 0 0-2.6-1.5L14 2h-4l-.4 2.5a7.4 7.4 0 0 0-2.6 1.5l-2.4-1-2 3.5 2 1.5a7.7 7.7 0 0 0-.1 1.5c0 .5 0 1 .1 1.5l-2 1.5 2 3.5 2.4-1a7.4 7.4 0 0 0 2.6 1.5L10 22h4l.4-2.5a7.4 7.4 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}
