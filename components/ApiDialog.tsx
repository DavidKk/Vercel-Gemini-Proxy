'use client'

import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { ScrollArea } from '@/components/ScrollArea'
import { Select } from '@/components/Select'
import { Tooltip } from '@/components/Tooltip'
import { DEFAULT_API_DIALOG_MODEL, type PublicModelInfo, type PublicModelsCatalog } from '@/services/gemini/publicModelsTypes'

type ApiDialogProps = {
  open: boolean
  onClose: () => void
}

/** API address dialog — Base URL + model picker + copyable paths. */
export function ApiDialog(props: ApiDialogProps) {
  const { open, onClose } = props
  const titleId = useId()
  const [copied, setCopied] = useState<string | null>(null)
  const [origin, setOrigin] = useState('')
  const [catalog, setCatalog] = useState<PublicModelsCatalog | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [modelId, setModelId] = useState(DEFAULT_API_DIALOG_MODEL)

  useEffect(() => {
    if (!open || typeof window === 'undefined') {
      return
    }
    setOrigin(window.location.origin)
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }
    let cancelled = false
    setCatalogLoading(true)
    setCatalogError(null)
    void fetch('/api/meta/models')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        return (await res.json()) as PublicModelsCatalog
      })
      .then((data) => {
        if (cancelled) {
          return
        }
        setCatalog(data)
        const ids = data.models.map((m) => m.id)
        setModelId((prev) => (ids.includes(prev) ? prev : (ids[0] ?? DEFAULT_API_DIALOG_MODEL)))
      })
      .catch(() => {
        if (!cancelled) {
          setCatalogError('Failed to load models')
          setCatalog(null)
          setModelId(DEFAULT_API_DIALOG_MODEL)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCatalogLoading(false)
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

  const modelOptions: PublicModelInfo[] = catalog?.models?.length ? catalog.models : [{ id: DEFAULT_API_DIALOG_MODEL, displayName: DEFAULT_API_DIALOG_MODEL }]

  const urls = useMemo(() => {
    if (!origin) {
      return null
    }
    const host = origin
    const apiRoot = `${host}/api`
    const model = modelId.trim() || DEFAULT_API_DIALOG_MODEL
    return {
      host,
      apiRoot,
      models: `${apiRoot}/v1beta/models`,
      generate: `${apiRoot}/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      stream: `${apiRoot}/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent`,
      docs: `${host}/docs/pass-key`,
    }
  }, [origin, modelId])

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
            API
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
          {urls ? (
            <div className="space-y-5 text-sm">
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Model</p>
                <Select
                  aria-label="Model"
                  value={modelId}
                  disabled={catalogLoading}
                  loading={catalogLoading}
                  options={modelOptions.map((model) => ({
                    value: model.id,
                    label: model.displayName === model.id ? model.id : `${model.displayName} (${model.id})`,
                  }))}
                  onChange={setModelId}
                  placeholder="Select model"
                />
                <p className="text-[12px] text-muted">
                  {catalogLoading
                    ? 'Loading models…'
                    : catalogError
                      ? catalogError
                      : catalog?.geminiKeyConfigured
                        ? catalog.source === 'upstream'
                          ? 'Models from server GEMINI_API_KEYS (key not exposed). Cached up to 1 day.'
                          : 'Using fallback model list.'
                        : 'GEMINI_API_KEYS not set — showing default model only.'}
                </p>
              </div>

              <CopyRow label="Origin" value={urls.host} copied={copied} copyLabel="Origin" onCopy={() => void copyText('Origin', urls.host)} />

              <CopyRow label="API Base URL" value={urls.apiRoot} copied={copied} copyLabel="API Base" onCopy={() => void copyText('API Base', urls.apiRoot)} />

              <CopyRow label="List models" value={urls.models} copied={copied} copyLabel="Models" onCopy={() => void copyText('Models', urls.models)} />

              <CopyRow label="generateContent" value={urls.generate} copied={copied} copyLabel="Generate" onCopy={() => void copyText('Generate', urls.generate)} />

              <CopyRow label="streamGenerateContent" value={urls.stream} copied={copied} copyLabel="Stream" onCopy={() => void copyText('Stream', urls.stream)} />

              <CopyRow
                label="Docs"
                value={urls.docs}
                copied={copied}
                copyLabel="Docs"
                onCopy={() => void copyText('Docs', urls.docs)}
                onOpen={() => window.open(urls.docs, '_blank', 'noopener,noreferrer')}
              />
            </div>
          ) : (
            <p className="text-sm text-muted">Loading…</p>
          )}
        </ScrollArea>
      </div>
    </div>,
    document.body
  )
}

function CopyRow(props: { label: string; value: string; copied: string | null; copyLabel: string; onCopy: () => void; onOpen?: () => void }) {
  const isCopied = props.copied === props.copyLabel
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{props.label}</p>
      <div className="flex items-center gap-1.5">
        <input
          readOnly
          value={props.value}
          onFocus={(event) => event.currentTarget.select()}
          onClick={(event) => event.currentTarget.select()}
          className="h-8 min-w-0 flex-1 rounded-md border border-border bg-canvas px-2.5 font-mono text-[11px] text-primary outline-none"
        />
        <Tooltip content={isCopied ? 'Copied' : 'Copy'} placement="top">
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

/** Header icon that opens the API address dialog. */
export function ApiHeaderButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Tooltip content="API" placement="bottom">
        <button
          type="button"
          aria-label="API"
          onClick={() => setOpen(true)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-subtle hover:bg-canvas"
        >
          <ApiIcon />
        </button>
      </Tooltip>
      <ApiDialog open={open} onClose={() => setOpen(false)} />
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

function ApiIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 7.5 4.5 12 8 16.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 7.5 19.5 12 16 16.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.2 5.5 10.8 18.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
