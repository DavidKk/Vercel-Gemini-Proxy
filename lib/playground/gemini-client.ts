import { stripModelPrefix } from './storage'
import type { GeminiContent, GeminiPart, PlaygroundImage } from './types'

/** Strip `data:<mime>;base64,` prefix from a data URL. */
export function dataUrlToBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(',')
  if (comma === -1) {
    return dataUrl
  }
  return dataUrl.slice(comma + 1)
}

type ListModelsResponse = {
  models?: Array<{
    name?: string
    supportedGenerationMethods?: string[]
  }>
}

function authHeaders(apiKey: string): HeadersInit {
  return {
    'x-goog-api-key': apiKey,
  }
}

/** True when fetch/stream was cancelled via AbortController (not a real failure). */
export function isAbortError(error: unknown) {
  if (!error) {
    return false
  }
  if (typeof error === 'string') {
    return /abort|operation was aborted|aborted without reason|The user aborted/i.test(error)
  }
  if (typeof error !== 'object') {
    return false
  }
  const name = 'name' in error ? String((error as { name: unknown }).name) : ''
  if (name === 'AbortError') {
    return true
  }
  // Some runtimes use message-only abort signals
  const message = 'message' in error ? String((error as { message: unknown }).message) : ''
  return /operation was aborted|aborted without reason|The user aborted/i.test(message)
}

export async function listModels(apiRoot: string, apiKey: string, signal?: AbortSignal): Promise<string[]> {
  if (signal?.aborted) {
    return []
  }

  let response: Response
  try {
    response = await fetch(`${apiRoot}/models`, {
      method: 'GET',
      headers: authHeaders(apiKey),
      signal,
    })
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) {
      return []
    }
    throw error
  }

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`List models failed (${response.status}): ${text || response.statusText}`)
  }

  const data = (await response.json()) as ListModelsResponse
  const models = data.models ?? []

  const withGenerate = models.filter((model) => {
    const methods = model.supportedGenerationMethods
    if (!methods || methods.length === 0) {
      return true
    }
    return methods.includes('generateContent')
  })

  return withGenerate.map((model) => (model.name ? stripModelPrefix(model.name) : '')).filter(Boolean)
}

export function extractTextFromChunk(chunk: unknown): string {
  if (!chunk || typeof chunk !== 'object') {
    return ''
  }

  const candidates = (chunk as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates
  const parts = candidates?.[0]?.content?.parts
  if (!parts?.length) {
    return ''
  }

  return parts.map((part) => part.text ?? '').join('')
}

export type GroundingSource = {
  title: string
  uri: string
}

/** Collect web grounding chunks from a generateContent SSE/JSON event. */
export function extractGroundingSources(chunk: unknown): GroundingSource[] {
  if (!chunk || typeof chunk !== 'object') {
    return []
  }

  const groundingChunks = (
    chunk as {
      candidates?: Array<{
        groundingMetadata?: {
          groundingChunks?: Array<{ web?: { title?: string; uri?: string } }>
        }
      }>
    }
  ).candidates?.[0]?.groundingMetadata?.groundingChunks

  if (!Array.isArray(groundingChunks)) {
    return []
  }

  const sources: GroundingSource[] = []
  for (const item of groundingChunks) {
    const uri = item?.web?.uri?.trim()
    if (!uri) {
      continue
    }
    const title = item.web?.title?.trim() || uri
    sources.push({ title, uri })
  }
  return sources
}

export function mergeGroundingSources(existing: GroundingSource[], incoming: GroundingSource[]): GroundingSource[] {
  if (incoming.length === 0) {
    return existing
  }
  const seen = new Set(existing.map((item) => item.uri))
  const next = [...existing]
  for (const source of incoming) {
    if (seen.has(source.uri)) {
      continue
    }
    seen.add(source.uri)
    next.push(source)
  }
  return next
}

/** Strip optional `data:` prefix from an SSE payload line. */
export function stripSseDataPrefix(line: string) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith(':')) {
    return ''
  }
  if (trimmed.startsWith('data:')) {
    return trimmed.slice(5).trim()
  }
  return trimmed
}

export function parseSseOrJsonLine(line: string): unknown | null {
  const payload = stripSseDataPrefix(line)
  if (!payload || payload === '[DONE]') {
    return null
  }

  try {
    return JSON.parse(payload)
  } catch {
    return null
  }
}

/**
 * Drain complete JSON objects from an SSE/text buffer.
 * Keeps a trailing incomplete fragment for the next chunk (common when TCP splits mid-event).
 */
export function consumeStreamBuffer(buffer: string): { events: unknown[]; rest: string } {
  const events: unknown[] = []
  let rest = buffer.replace(/\r\n/g, '\n')

  while (rest.length > 0) {
    const nl = rest.indexOf('\n')
    if (nl === -1) {
      const parsed = parseSseOrJsonLine(rest)
      if (parsed) {
        events.push(parsed)
        return { events, rest: '' }
      }
      break
    }

    const line = rest.slice(0, nl)
    rest = rest.slice(nl + 1)

    if (!line.trim()) {
      continue
    }

    const parsed = parseSseOrJsonLine(line)
    if (parsed) {
      events.push(parsed)
      continue
    }

    const payload = stripSseDataPrefix(line)
    if (payload.startsWith('{') || payload.startsWith('[')) {
      rest = line + '\n' + rest
      break
    }
  }

  return { events, rest }
}

export type StreamGenerateOptions = {
  apiRoot: string
  apiKey: string
  modelId: string
  contents: GeminiContent[]
  /** Enable Gemini Grounding with Google Search. */
  googleSearch?: boolean
  signal?: AbortSignal
  onChunk: (textDelta: string) => void
  onSources?: (sources: GroundingSource[]) => void
}

/** Build generateContent JSON body (contents + optional google_search tool). */
export function buildStreamGenerateBody(contents: GeminiContent[], googleSearch = false) {
  if (!googleSearch) {
    return { contents }
  }
  return {
    contents,
    tools: [{ google_search: {} }],
  }
}

/**
 * Stream generateContent via alt=sse.
 * Abort/cancel always resolves normally (never throws AbortError).
 */
export async function streamGenerateContent(options: StreamGenerateOptions) {
  const { apiRoot, apiKey, modelId, contents, googleSearch = false, signal, onChunk, onSources } = options
  if (signal?.aborted) {
    return
  }

  const url = `${apiRoot}/models/${encodeURIComponent(modelId)}:streamGenerateContent?alt=sse`

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        ...authHeaders(apiKey),
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(buildStreamGenerateBody(contents, googleSearch)),
      signal,
    })
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) {
      return
    }
    throw error
  }

  if (signal?.aborted) {
    return
  }

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Generate failed (${response.status}): ${text || response.statusText}`)
  }

  if (!response.body) {
    throw new Error('Generate failed: empty response body')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let collectedSources: GroundingSource[] = []

  const handleEvent = (event: unknown) => {
    const delta = extractTextFromChunk(event)
    if (delta) {
      onChunk(delta)
    }
    if (!onSources) {
      return
    }
    const nextSources = extractGroundingSources(event)
    if (nextSources.length === 0) {
      return
    }
    const merged = mergeGroundingSources(collectedSources, nextSources)
    if (merged.length === collectedSources.length) {
      return
    }
    collectedSources = merged
    onSources(collectedSources)
  }

  try {
    while (true) {
      if (signal?.aborted) {
        break
      }

      const { done, value } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const { events, rest } = consumeStreamBuffer(buffer)
      buffer = rest

      for (const event of events) {
        if (signal?.aborted) {
          break
        }
        handleEvent(event)
      }
    }

    if (!signal?.aborted) {
      buffer += decoder.decode()
      if (buffer.trim()) {
        const { events } = consumeStreamBuffer(buffer + '\n')
        for (const event of events) {
          handleEvent(event)
        }
      }
    }
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) {
      return
    }
    throw error
  } finally {
    try {
      await reader.cancel()
    } catch {
      // ignore
    }
  }
}

function buildParts(content: string, image?: PlaygroundImage): GeminiPart[] {
  const parts: GeminiPart[] = []
  if (image) {
    parts.push({
      inline_data: {
        mime_type: image.mimeType,
        data: dataUrlToBase64(image.dataUrl),
      },
    })
  }
  const text = content.trim()
  if (text) {
    parts.push({ text })
  }
  return parts
}

/** Map playground messages to Gemini multiturn contents. */
export function toGeminiContents(messages: Array<{ role: 'user' | 'assistant'; content: string; image?: PlaygroundImage }>): GeminiContent[] {
  return messages
    .map((message) => {
      const parts = buildParts(message.content, message.image)
      if (parts.length === 0) {
        return null
      }
      return {
        role: (message.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
        parts,
      }
    })
    .filter((content): content is GeminiContent => content !== null)
}
