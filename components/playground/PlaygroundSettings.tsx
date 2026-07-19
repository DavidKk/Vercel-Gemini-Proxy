'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { ScrollArea } from '@/components/ScrollArea'
import type { PlaygroundSettings } from '@/lib/playground/types'

type PlaygroundSettingsProps = {
  settings: PlaygroundSettings
  onSave: (next: PlaygroundSettings) => void
}

export function PlaygroundSettingsPanel(props: PlaygroundSettingsProps) {
  const { settings, onSave } = props
  const [draft, setDraft] = useState(settings)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const baseUrlPreview = useMemo(() => {
    const key = draft.apiKey.trim()
    const root = `${origin || 'https://<host>'}/api/v1beta`
    return key ? `${root}?key=${key}` : `${root}?key=`
  }, [draft.apiKey, origin])

  const handleSave = () => {
    onSave({
      ...draft,
      apiKey: draft.apiKey.trim(),
      useCustomBaseUrl: false,
      baseUrl: '',
    })
    setSavedAt(Date.now())
  }

  return (
    <ScrollArea className="min-h-0 flex-1" scrollClassName="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
      <section className="border border-border bg-surface p-5">
        <h2 className="font-display text-sm font-semibold tracking-tight text-primary">Proxy credentials</h2>
        <p className="mt-1 text-xs text-muted">Stored only in this browser (localStorage). Requests always go through this proxy.</p>

        <label className="mt-4 block text-xs font-medium text-subtle">
          API Key
          <input
            type="password"
            autoComplete="off"
            value={draft.apiKey}
            onChange={(event) => setDraft((prev) => ({ ...prev, apiKey: event.target.value }))}
            placeholder="AIza… or your Gemini key"
            className="mt-1.5 w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-primary outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/15"
          />
        </label>

        <div className="mt-4">
          <p className="text-xs font-medium text-subtle">Base URL</p>
          <code className="mt-1.5 block break-all rounded-md border border-border bg-canvas px-3 py-2 font-mono text-xs text-primary">{baseUrlPreview}</code>
          <p className="mt-1 text-xs font-normal text-muted">Fixed to this deployment&apos;s `/api/v1beta`. Not configurable.</p>
        </div>

        <button type="button" onClick={handleSave} className="mt-5 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">
          Save settings
        </button>
        {savedAt ? (
          <p className="mt-2 text-xs text-muted">
            Saved.{' '}
            <Link href="/chat" className="font-medium text-brand hover:text-brand-hover">
              Back to chat
            </Link>{' '}
            and Refresh models if needed.
          </p>
        ) : null}
      </section>
    </ScrollArea>
  )
}
