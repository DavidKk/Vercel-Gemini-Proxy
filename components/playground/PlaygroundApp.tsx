'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { buildChatRailSegments } from '@/lib/playground/chat-rail'
import { isAbortError, listModels, streamGenerateContent, toGeminiContents } from '@/lib/playground/gemini-client'
import { clearMessages, loadMessages, loadModelsCache, loadSettings, resolveApiRoot, saveMessages, saveModelsCache, saveSettings } from '@/lib/playground/storage'
import { DEFAULT_PLAYGROUND_SETTINGS, type PlaygroundMessage, type PlaygroundSendPayload, type PlaygroundSettings } from '@/lib/playground/types'

import { ConversationRail } from './ConversationRail'
import { PlaygroundChatShell } from './PlaygroundChatShell'
import { PlaygroundComposer } from './PlaygroundComposer'
import { PlaygroundHeader } from './PlaygroundHeader'
import { PlaygroundMessageList } from './PlaygroundMessageList'
import { useChatRail } from './useChatRail'

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function silenceAbort(error: unknown) {
  if (isAbortError(error)) {
    return
  }
  // keep unexpected errors visible in console for debugging
  // eslint-disable-next-line no-console
  console.error(error)
}

export function PlaygroundApp() {
  const [settings, setSettings] = useState<PlaygroundSettings>(DEFAULT_PLAYGROUND_SETTINGS)
  const [hydrated, setHydrated] = useState(false)
  const [messages, setMessages] = useState<PlaygroundMessage[]>([])
  const [models, setModels] = useState<string[]>([])
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [modelsLoading, setModelsLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [status, setStatus] = useState('')
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const streamPromiseRef = useRef<Promise<void> | null>(null)
  const modelsAbortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  const streamingRef = useRef(false)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    mountedRef.current = true
    const nextSettings = loadSettings()
    setSettings(nextSettings)
    setMessages(loadMessages())
    const cached = loadModelsCache(resolveApiRoot(nextSettings))
    if (cached && cached.length > 0) {
      setModels(cached)
      setModelsLoaded(true)
    }
    setHydrated(true)

    return () => {
      mountedRef.current = false
      // Do not abort() here — refresh/HMR would turn into Next.js Runtime AbortError.
      // AbortError is filtered in <head> via SUPPRESS_ABORT_ERRORS_SCRIPT (before Next loads).
      modelsAbortRef.current = null
      abortRef.current = null
      streamPromiseRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!hydrated) {
      return
    }
    saveMessages(messages)
  }, [hydrated, messages])

  useEffect(() => {
    if (!streaming) {
      return
    }
    const el = listRef.current
    if (!el) {
      return
    }
    el.scrollTop = el.scrollHeight
  }, [messages, streaming])

  const apiRoot = useMemo(() => resolveApiRoot(settings), [settings])

  const disabledReason = useMemo(() => {
    if (!hydrated) {
      return 'Loading…'
    }
    if (!settings.apiKey.trim()) {
      return 'Set API Key in Settings'
    }
    if (!settings.modelId) {
      return 'Refresh and select a model'
    }
    return undefined
  }, [hydrated, settings.apiKey, settings.modelId])

  const applyModels = useCallback(
    (nextModels: string[], source: 'cache' | 'network') => {
      if (!mountedRef.current) {
        return
      }
      setModels(nextModels)
      setModelsLoaded(true)
      const stillValid = nextModels.includes(settings.modelId)
      if (!stillValid) {
        const fallback = nextModels[0] ?? ''
        const nextSettings = { ...settings, modelId: fallback }
        saveSettings(nextSettings)
        setSettings(nextSettings)
      }
      setStatus(nextModels.length ? (source === 'cache' ? `Using ${nextModels.length} cached models` : `Loaded ${nextModels.length} models`) : 'No models returned')
    },
    [settings]
  )

  const handleRefreshModels = useCallback(
    async (force = false) => {
      if (!settings.apiKey.trim()) {
        setStatus('Set API Key in Settings first')
        return
      }

      if (!force) {
        const cached = loadModelsCache(apiRoot)
        if (cached && cached.length > 0) {
          applyModels(cached, 'cache')
          return
        }
      }

      modelsAbortRef.current?.abort()
      const controller = new AbortController()
      modelsAbortRef.current = controller

      setModelsLoading(true)
      setStatus('Loading models…')
      try {
        const nextModels = await listModels(apiRoot, settings.apiKey.trim(), controller.signal)
        if (controller.signal.aborted || !mountedRef.current) {
          return
        }
        saveModelsCache(apiRoot, nextModels)
        applyModels(nextModels, 'network')
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error) || !mountedRef.current) {
          return
        }
        const message = error instanceof Error ? error.message : String(error)
        setStatus(message)
        setModelsLoaded(false)
      } finally {
        if (modelsAbortRef.current === controller) {
          modelsAbortRef.current = null
        }
        if (mountedRef.current) {
          setModelsLoading(false)
        }
      }
    },
    [apiRoot, applyModels, settings.apiKey]
  )

  const handleSelectModel = useCallback(
    (modelId: string) => {
      const next = { ...settings, modelId }
      saveSettings(next)
      setSettings(next)
    },
    [settings]
  )

  const handleToggleGoogleSearch = useCallback(() => {
    const next = { ...settings, googleSearch: !settings.googleSearch }
    saveSettings(next)
    setSettings(next)
  }, [settings])

  const handleStop = useCallback(() => {
    const controller = abortRef.current
    abortRef.current = null
    const pending = streamPromiseRef.current
    streamPromiseRef.current = null

    if (controller && !controller.signal.aborted) {
      try {
        controller.abort()
      } catch {
        // ignore
      }
    }

    // Ensure the aborted fetch never becomes an unhandled rejection / Next overlay error.
    if (pending) {
      void pending.catch(silenceAbort)
    }

    setStreaming(false)
    streamingRef.current = false
    setStatus('Stopped')
  }, [])

  const handleSend = useCallback(
    async (payload: PlaygroundSendPayload) => {
      if (!settings.apiKey.trim() || !settings.modelId || streamingRef.current) {
        return
      }

      const text = payload.text.trim()
      if (!text && !payload.image) {
        return
      }

      const userMessage: PlaygroundMessage = {
        id: createId(),
        role: 'user',
        content: text,
        ...(payload.image ? { image: payload.image } : {}),
        createdAt: Date.now(),
      }
      const assistantId = createId()
      const assistantMessage: PlaygroundMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
      }

      const historyForRequest = [...messages, userMessage]
      setMessages([...historyForRequest, assistantMessage])
      streamingRef.current = true
      setStreaming(true)
      setStatus('Thinking…')

      const controller = new AbortController()
      abortRef.current = controller

      let runPromise!: Promise<void>
      runPromise = (async () => {
        try {
          await streamGenerateContent({
            apiRoot,
            apiKey: settings.apiKey.trim(),
            modelId: settings.modelId,
            contents: toGeminiContents(historyForRequest),
            googleSearch: settings.googleSearch,
            signal: controller.signal,
            onChunk: (delta) => {
              if (!mountedRef.current) {
                return
              }
              setStatus((prev) => (prev === 'Thinking…' ? 'Streaming…' : prev))
              setMessages((prev) => prev.map((message) => (message.id === assistantId ? { ...message, content: message.content + delta } : message)))
            },
            onSources: (sources) => {
              if (!mountedRef.current) {
                return
              }
              setMessages((prev) => prev.map((message) => (message.id === assistantId ? { ...message, sources } : message)))
            },
          })
          if (!mountedRef.current) {
            return
          }
          if (!controller.signal.aborted) {
            setStatus('')
          }
        } catch (error) {
          if (!mountedRef.current) {
            return
          }
          if (controller.signal.aborted || isAbortError(error)) {
            setStatus((prev) => (prev === 'Thinking…' || prev === 'Streaming…' ? 'Stopped' : prev))
            return
          }
          const message = error instanceof Error ? error.message : String(error)
          setStatus(message)
          setMessages((prev) => prev.map((item) => (item.id === assistantId && !item.content ? { ...item, content: `Error: ${message}` } : item)))
        } finally {
          if (abortRef.current === controller) {
            abortRef.current = null
          }
          if (streamPromiseRef.current === runPromise) {
            streamPromiseRef.current = null
          }
          streamingRef.current = false
          if (mountedRef.current) {
            setStreaming(false)
          }
        }
      })()

      // Keep a handle so Stop can swallow rejection before Next overlay sees it.
      streamPromiseRef.current = runPromise
      void runPromise.catch(silenceAbort)
    },
    [apiRoot, messages, settings.apiKey, settings.googleSearch, settings.modelId]
  )

  const handleClear = useCallback(() => {
    handleStop()
    setMessages([])
    clearMessages()
    setStatus('')
    setClearConfirmOpen(false)
  }, [handleStop])

  const handleRequestClear = useCallback(() => {
    if (messages.length === 0) {
      return
    }
    setClearConfirmOpen(true)
  }, [messages.length])

  const railSegments = useMemo(
    () =>
      buildChatRailSegments(
        messages.map((message, index) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          streaming: streaming && index === messages.length - 1 && message.role === 'assistant',
        }))
      ),
    [messages, streaming]
  )
  const segmentIds = useMemo(() => railSegments.map((segment) => segment.id), [railSegments])
  const { registerSegment, activeSegmentId, scrollToSegment } = useChatRail(listRef, segmentIds)

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      <PlaygroundHeader variant="chat" onClear={handleRequestClear} clearDisabled={messages.length === 0} />

      <PlaygroundChatShell
        scrollRef={listRef}
        leftRail={railSegments.length > 0 ? <ConversationRail segments={railSegments} activeSegmentId={activeSegmentId} onSelect={scrollToSegment} /> : undefined}
        footer={
          <PlaygroundComposer
            modelId={settings.modelId}
            models={models}
            modelsLoaded={modelsLoaded}
            modelsLoading={modelsLoading}
            googleSearch={settings.googleSearch}
            streaming={streaming}
            disabledReason={disabledReason}
            status={status}
            onRefreshModels={handleRefreshModels}
            onSelectModel={handleSelectModel}
            onToggleGoogleSearch={handleToggleGoogleSearch}
            onSend={handleSend}
            onStop={handleStop}
            onStatus={setStatus}
          />
        }
      >
        <PlaygroundMessageList messages={messages} streaming={streaming} loading={!hydrated} registerSegment={registerSegment} />
      </PlaygroundChatShell>

      <ConfirmDialog
        open={clearConfirmOpen}
        title="Clear chat?"
        message="This will remove the current conversation from this browser. This cannot be undone."
        confirmLabel="Clear"
        cancelLabel="Cancel"
        destructive
        onCancel={() => setClearConfirmOpen(false)}
        onConfirm={handleClear}
      />
    </div>
  )
}
