'use client'

import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { Skeleton, SkeletonRegion } from '@/components/playground/PlaygroundSkeletons'
import { ScrollArea } from '@/components/ScrollArea'
import { Tooltip } from '@/components/Tooltip'
import { buildCursorMcpInstallDeepLink, buildCursorMcpJson, buildVsCodeMcpInstallDeepLink, MCP_INSTALL_SERVER_KEY } from '@/services/mcp/installSnippets'

type McpMeta = {
  endpoint: string
  skillUrl: string
  skillResourceUri: string
  serverKey: string
  proxyConfigured: boolean
  geminiKeyConfigured?: boolean
  headerNames: string[]
  headerPlaceholders: Record<string, string>
  authHint: string
}

type McpDialogProps = {
  open: boolean
  onClose: () => void
}

/** MCP + Skill install dialog (Skill URL, MCP URL, Cursor/VS Code one-click). */
export function McpDialog(props: McpDialogProps) {
  const { open, onClose } = props
  const titleId = useId()
  const [meta, setMeta] = useState<McpMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    void fetch('/api/mcp/meta')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        return (await res.json()) as McpMeta
      })
      .then((data) => {
        if (!cancelled) {
          setMeta(data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load MCP meta')
          setMeta(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const installHeaders = useMemo(() => meta?.headerPlaceholders ?? {}, [meta])

  const mcpJson = useMemo(() => {
    if (!meta) {
      return ''
    }
    return buildCursorMcpJson(meta.endpoint, meta.serverKey || MCP_INSTALL_SERVER_KEY, installHeaders)
  }, [meta, installHeaders])

  const copyText = useCallback(async (label: string, text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        ta.remove()
      }
      setCopied(label)
      window.setTimeout(() => setCopied(null), 1600)
    } catch {
      setCopied('Copy failed')
      window.setTimeout(() => setCopied(null), 1600)
    }
  }, [])

  if (!open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={onClose}>
      <div
        className="flex max-h-[min(80vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-md border border-border bg-surface shadow-composer"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id={titleId} className="font-display text-sm font-semibold text-primary">
            MCP & Skill
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-subtle hover:bg-canvas"
          >
            <CloseIcon />
          </button>
        </div>

        <ScrollArea className="min-h-0 flex-1" scrollClassName="p-4">
          {loading ? <McpDialogSkeleton /> : null}
          {!loading && error ? <p className="text-sm text-red-600">{error}</p> : null}
          {!loading && meta ? (
            <div className="space-y-5 text-sm">
              <p className="leading-relaxed text-muted">
                Install this HTTP MCP for Skill docs and a list-models smoke test. Generation stays on REST / Playground. Skill resource:{' '}
                <code className="font-mono text-[12px] text-primary">{meta.skillResourceUri}</code>.
              </p>

              <MetaRow
                label="Skill — Gemini Relay"
                value={meta.skillUrl}
                copied={copied}
                onCopy={() => void copyText('Skill', meta.skillUrl)}
                onOpen={() => window.open(meta.skillUrl, '_blank', 'noopener,noreferrer')}
              />

              <MetaRow label="MCP URL (GET manifest · POST JSON-RPC)" value={meta.endpoint} copied={copied} onCopy={() => void copyText('MCP URL', meta.endpoint)} />

              <div className="space-y-1.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Auth</p>
                <p className="text-[13px] leading-relaxed text-muted">{meta.authHint}</p>
                {meta.proxyConfigured ? (
                  <p className="font-mono text-[12px] text-primary">
                    Headers: {meta.headerNames.join(', ')} (replace placeholders in mcp.json)
                    {meta.geminiKeyConfigured === false ? ' · server GEMINI_API_KEYS is not set yet' : ''}
                  </p>
                ) : (
                  <p className="text-[13px] text-amber-800">
                    Proxy env not configured — one-click install is disabled until <code className="font-mono text-[12px]">PROXY_AUTH_HEADERS</code> is set.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Install</p>
                {meta.proxyConfigured ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={buildCursorMcpInstallDeepLink(meta.endpoint, meta.serverKey, installHeaders)}
                        className="inline-flex items-center rounded-md border border-border bg-canvas px-2.5 py-1.5 text-[12px] font-medium text-primary hover:border-brand hover:text-brand-hover"
                      >
                        Cursor
                      </a>
                      <a
                        href={buildVsCodeMcpInstallDeepLink(meta.endpoint, meta.serverKey, 'stable', installHeaders)}
                        className="inline-flex items-center rounded-md border border-border bg-canvas px-2.5 py-1.5 text-[12px] font-medium text-primary hover:border-brand hover:text-brand-hover"
                      >
                        VS Code
                      </a>
                      <a
                        href={buildVsCodeMcpInstallDeepLink(meta.endpoint, meta.serverKey, 'insiders', installHeaders)}
                        className="inline-flex items-center rounded-md border border-border bg-canvas px-2.5 py-1.5 text-[12px] font-medium text-primary hover:border-brand hover:text-brand-hover"
                      >
                        Insiders
                      </a>
                      <button
                        type="button"
                        onClick={() => void copyText('mcp.json', mcpJson)}
                        className="inline-flex items-center rounded-md border border-border bg-canvas px-2.5 py-1.5 text-[12px] font-medium text-primary hover:border-brand hover:text-brand-hover"
                      >
                        {copied === 'mcp.json' ? 'Copied' : 'Copy mcp.json'}
                      </button>
                    </div>
                    <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-canvas px-3 py-2 font-mono text-[11px] leading-relaxed text-primary">{mcpJson}</pre>
                  </>
                ) : (
                  <p className="text-[13px] text-muted">Set proxy env on the server, redeploy, then reopen this dialog.</p>
                )}
              </div>
            </div>
          ) : null}
        </ScrollArea>
      </div>
    </div>,
    document.body
  )
}

function MetaRow(props: { label: string; value: string; copied: string | null; onCopy: () => void; onOpen?: () => void }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{props.label}</p>
      <div className="flex items-center gap-1.5">
        <input readOnly value={props.value} className="h-8 min-w-0 flex-1 rounded-md border border-border bg-canvas px-2.5 font-mono text-[11px] text-primary outline-none" />
        <Tooltip content={props.copied === props.label.split(' ')[0] || props.copied === 'Skill' || props.copied === 'MCP URL' ? 'Copied' : 'Copy'} placement="top">
          <button
            type="button"
            aria-label="Copy"
            onClick={props.onCopy}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-subtle hover:bg-canvas"
          >
            <CopyIcon />
          </button>
        </Tooltip>
        {props.onOpen ? (
          <Tooltip content="Open" placement="top">
            <button
              type="button"
              aria-label="Open"
              onClick={props.onOpen}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-subtle hover:bg-canvas"
            >
              <ExternalIcon />
            </button>
          </Tooltip>
        ) : null}
      </div>
    </div>
  )
}

function MetaRowSkeleton(props: { withOpen?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-3 w-36" />
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-8 min-w-0 flex-1" />
        <Skeleton className="h-8 w-8 shrink-0" />
        {props.withOpen ? <Skeleton className="h-8 w-8 shrink-0" /> : null}
      </div>
    </div>
  )
}

/** Placeholder matching loaded dialog layout — avoids jump from a one-line Loading… */
function McpDialogSkeleton() {
  return (
    <SkeletonRegion label="Loading MCP & Skill" className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-full max-w-[34rem]" />
        <Skeleton className="h-3.5 w-[88%] max-w-[30rem]" />
      </div>
      <MetaRowSkeleton withOpen />
      <MetaRowSkeleton />
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3.5 w-full max-w-[28rem]" />
        <Skeleton className="h-3 w-52" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-14" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-[4.5rem]" />
          <Skeleton className="h-8 w-[4.25rem]" />
          <Skeleton className="h-8 w-[6.5rem]" />
        </div>
        <Skeleton className="mt-2 h-28 w-full" />
      </div>
    </SkeletonRegion>
  )
}

/** Header icon that opens the MCP & Skill dialog. */
export function McpHeaderButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Tooltip content="MCP" placement="bottom">
        <button
          type="button"
          aria-label="MCP"
          onClick={() => setOpen(true)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-subtle hover:bg-canvas"
        >
          <McpIcon />
        </button>
      </Tooltip>
      <McpDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 16V6a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 4h6v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 14L20 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M20 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function McpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.5c-1.8 0-3.2 1.2-3.2 2.8v1.2H7.5A2.5 2.5 0 0 0 5 10v7.5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5V10a2.5 2.5 0 0 0-2.5-2.5h-1.3V6.3c0-1.6-1.4-2.8-3.2-2.8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="9.5" cy="13.5" r="1" fill="currentColor" />
      <circle cx="14.5" cy="13.5" r="1" fill="currentColor" />
    </svg>
  )
}
