'use client'

import Link from 'next/link'

import { ApiHeaderButton } from '@/components/ApiDialog'
import { BrandLogo } from '@/components/BrandLogo'
import { McpHeaderButton } from '@/components/McpDialog'
import { Tooltip } from '@/components/Tooltip'

const GITHUB_REPO = 'https://github.com/DavidKk/Vercel-Gemini-Proxy'
const DOCS_HREF = '/docs/pass-key'

const navIconClass = 'inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-subtle hover:bg-canvas'

type ChatHeaderProps = {
  variant: 'chat'
  onClear: () => void
  clearDisabled?: boolean
}

type SettingsHeaderProps = {
  variant: 'settings'
}

type PlaygroundHeaderProps = ChatHeaderProps | SettingsHeaderProps

function DocsAndGitHubLinks() {
  return (
    <>
      <Tooltip content="Docs" placement="bottom">
        <Link href={DOCS_HREF} aria-label="Docs" className={navIconClass}>
          <DocsIcon />
        </Link>
      </Tooltip>
      <Tooltip content="GitHub" placement="bottom">
        <a href={GITHUB_REPO} target="_blank" rel="noreferrer" aria-label="GitHub" className={navIconClass}>
          <GitHubIcon />
        </a>
      </Tooltip>
    </>
  )
}

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
          <Tooltip content="Back to chat" placement="bottom">
            <Link href="/chat" aria-label="Back to chat" className={navIconClass}>
              <CloseIcon />
            </Link>
          </Tooltip>
          <ApiHeaderButton />
          <McpHeaderButton />
          <DocsAndGitHubLinks />
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
        <Tooltip content={props.clearDisabled ? 'Nothing to clear' : 'Clear chat'} placement="bottom">
          <button
            type="button"
            onClick={props.onClear}
            disabled={props.clearDisabled}
            aria-label="Clear chat"
            className={`${navIconClass} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
          >
            <ClearIcon />
          </button>
        </Tooltip>
        <Tooltip content="Settings" placement="bottom">
          <Link href="/settings" aria-label="Settings" className={navIconClass}>
            <SettingsIcon />
          </Link>
        </Tooltip>
        <ApiHeaderButton />
        <McpHeaderButton />
        <DocsAndGitHubLinks />
      </div>
    </header>
  )
}

function DocsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4.5h7.5L18 8v11.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14.5 4.5V8H18M9 12h6M9 15.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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
