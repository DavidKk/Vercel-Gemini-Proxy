'use client'

import { type ChangeEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'

import { ScrollArea } from '@/components/ScrollArea'
import { Tooltip } from '@/components/Tooltip'
import { PLAYGROUND_IMAGE_MAX_BYTES, PLAYGROUND_IMAGE_MIMES, type PlaygroundImage, type PlaygroundImageMime, type PlaygroundSendPayload } from '@/lib/playground/types'

type PlaygroundComposerProps = {
  modelId: string
  models: string[]
  modelsLoaded: boolean
  modelsLoading: boolean
  googleSearch: boolean
  streaming: boolean
  disabledReason?: string
  status?: string
  onRefreshModels: (force?: boolean) => void
  onSelectModel: (modelId: string) => void
  onToggleGoogleSearch: () => void
  onSend: (payload: PlaygroundSendPayload) => void
  onStop: () => void
  onStatus?: (message: string) => void
}

function isAllowedMime(mime: string): mime is PlaygroundImageMime {
  return (PLAYGROUND_IMAGE_MIMES as readonly string[]).includes(mime)
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export function PlaygroundComposer(props: PlaygroundComposerProps) {
  const {
    modelId,
    models,
    modelsLoaded,
    modelsLoading,
    googleSearch,
    streaming,
    disabledReason,
    status,
    onRefreshModels,
    onSelectModel,
    onToggleGoogleSearch,
    onSend,
    onStop,
    onStatus,
  } = props

  const [text, setText] = useState('')
  const [image, setImage] = useState<PlaygroundImage | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) {
      return
    }
    el.style.height = '0px'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }, [text])

  useEffect(() => {
    if (!pickerOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (target && pickerRef.current?.contains(target)) {
        return
      }
      setPickerOpen(false)
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPickerOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [pickerOpen])

  const canSend = (Boolean(text.trim()) || Boolean(image)) && !streaming && !disabledReason

  const send = () => {
    if (!canSend) {
      return
    }
    const payload: PlaygroundSendPayload = {
      text: text.trim(),
      ...(image ? { image } : {}),
    }
    setText('')
    setImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onSend(payload)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      send()
    }
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    if (!isAllowedMime(file.type)) {
      onStatus?.('Images only (jpg / png / webp / gif)')
      return
    }
    if (file.size > PLAYGROUND_IMAGE_MAX_BYTES) {
      onStatus?.('Image too large (max 4MB)')
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setImage({ mimeType: file.type, dataUrl })
      onStatus?.('')
    } catch {
      onStatus?.('Failed to read image')
    }
  }

  return (
    <div className="shrink-0 px-3 pb-4 pt-1">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-md border border-border bg-surface px-3 pb-2 pt-2.5 shadow-composer ring-1 ring-border/50 focus-within:border-brand/40 focus-within:ring-brand/15">
          {image ? (
            <div className="mb-2 flex items-start px-1">
              <div className="relative">
                <img src={image.dataUrl} alt="Attachment preview" className="h-16 w-16 rounded-md object-cover ring-1 ring-border" />
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-md bg-panel text-[10px] text-panel-fg hover:bg-primary"
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            </div>
          ) : null}

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Message Gemini…"
            className="max-h-[180px] min-h-[44px] w-full resize-none bg-transparent px-1 py-2 text-[15px] leading-relaxed text-primary outline-none placeholder:text-muted"
          />

          <div className="flex items-center justify-between gap-1.5 pb-1 pt-1">
            <div className="flex items-center gap-1">
              <input ref={fileInputRef} type="file" accept={PLAYGROUND_IMAGE_MIMES.join(',')} className="hidden" onChange={handleFileChange} />
              <Tooltip content="Upload image" placement="top">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={streaming || Boolean(disabledReason)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-black/[0.04] text-subtle transition-colors hover:bg-black/[0.07] hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Upload image"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </Tooltip>
              <Tooltip content={googleSearch ? 'Web search on' : 'Web search off'} placement="top">
                <button
                  type="button"
                  onClick={onToggleGoogleSearch}
                  disabled={streaming || Boolean(disabledReason)}
                  aria-pressed={googleSearch}
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    googleSearch ? 'bg-brand/15 text-brand hover:bg-brand/20' : 'bg-black/[0.04] text-subtle hover:bg-black/[0.07] hover:text-primary'
                  }`}
                  aria-label={googleSearch ? 'Disable web search' : 'Enable web search'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
                    <path d="M3 12h18M12 3c2.5 2.8 3.75 5.8 3.75 9S14.5 18.2 12 21c-2.5-2.8-3.75-5.8-3.75-9S9.5 5.8 12 3z" stroke="currentColor" strokeWidth="1.75" />
                  </svg>
                </button>
              </Tooltip>
            </div>

            <div className="flex min-w-0 items-center gap-1.5">
              <div ref={pickerRef} className="relative min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    if (!modelsLoaded || models.length === 0) {
                      onRefreshModels(false)
                      return
                    }
                    setPickerOpen((open) => !open)
                  }}
                  disabled={modelsLoading}
                  aria-expanded={pickerOpen}
                  aria-haspopup="listbox"
                  className="inline-flex h-9 max-w-[280px] items-center justify-center truncate rounded-md bg-black/[0.04] px-2.5 font-display text-xs font-medium text-subtle transition-[background-color,padding] duration-150 ease-out hover:bg-black/[0.07] hover:px-4 disabled:opacity-60 disabled:hover:px-2.5"
                >
                  {modelsLoading ? 'Loading…' : !modelsLoaded || models.length === 0 ? 'Refresh models' : modelId || 'Select model'}
                </button>

                {pickerOpen && models.length > 0 ? (
                  <div role="listbox" className="absolute bottom-full right-0 z-20 mb-2 w-72 overflow-hidden border border-border bg-surface py-1 shadow-composer">
                    <ScrollArea className="max-h-56 min-h-0" scrollClassName="py-0">
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-xs text-muted hover:bg-canvas"
                        onClick={() => {
                          setPickerOpen(false)
                          onRefreshModels(true)
                        }}
                      >
                        Refresh list
                      </button>
                      {models.map((model) => (
                        <button
                          key={model}
                          type="button"
                          role="option"
                          aria-selected={model === modelId}
                          className={`block w-full truncate px-3 py-2 text-left text-xs hover:bg-canvas ${model === modelId ? 'font-semibold text-brand' : 'text-primary'}`}
                          onClick={() => {
                            onSelectModel(model)
                            setPickerOpen(false)
                          }}
                        >
                          {model}
                        </button>
                      ))}
                    </ScrollArea>
                  </div>
                ) : null}
              </div>

              {streaming ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-600 text-white hover:bg-red-700"
                  aria-label="Stop"
                >
                  <span className="h-3 w-3 rounded-[2px] bg-white" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canSend}
                  onClick={send}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-border"
                  aria-label="Send"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 19V5M12 5l-6 6M12 5l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="mt-2 px-1 text-center text-[11px] text-muted">
          {disabledReason || status || (googleSearch ? 'Web search on · Enter to send · Shift+Enter for newline' : 'Enter to send · Shift+Enter for newline · + to upload image')}
        </p>
      </div>
    </div>
  )
}
