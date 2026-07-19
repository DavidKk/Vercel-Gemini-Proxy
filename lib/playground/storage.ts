import { DEFAULT_API_ROOT, DEFAULT_PLAYGROUND_SETTINGS, MODELS_CACHE_TTL_MS, type ModelsCachePayload, type PlaygroundMessage, type PlaygroundSettings, STORAGE_KEYS } from './types'

function readString(key: string, fallback = '') {
  if (typeof window === 'undefined') {
    return fallback
  }
  return window.localStorage.getItem(key) ?? fallback
}

function writeString(key: string, value: string) {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(key, value)
}

function removeKey(key: string) {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.removeItem(key)
}

/** Strip trailing slashes from a URL or path. */
export function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

/** Resolve API root from settings (no trailing slash). Always same-origin proxy. */
export function resolveApiRoot(_settings?: Pick<PlaygroundSettings, 'useCustomBaseUrl' | 'baseUrl'>) {
  void _settings
  return DEFAULT_API_ROOT
}

export function loadSettings(): PlaygroundSettings {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_PLAYGROUND_SETTINGS }
  }

  return {
    apiKey: readString(STORAGE_KEYS.apiKey),
    useCustomBaseUrl: readString(STORAGE_KEYS.useCustomBaseUrl) === '1',
    baseUrl: readString(STORAGE_KEYS.baseUrl),
    modelId: readString(STORAGE_KEYS.modelId),
    googleSearch: readString(STORAGE_KEYS.googleSearch) === '1',
  }
}

export function saveSettings(settings: PlaygroundSettings) {
  writeString(STORAGE_KEYS.apiKey, settings.apiKey)
  writeString(STORAGE_KEYS.useCustomBaseUrl, settings.useCustomBaseUrl ? '1' : '0')
  writeString(STORAGE_KEYS.baseUrl, settings.baseUrl)
  writeString(STORAGE_KEYS.modelId, settings.modelId)
  writeString(STORAGE_KEYS.googleSearch, settings.googleSearch ? '1' : '0')
}

function isPlaygroundMessage(value: unknown): value is PlaygroundMessage {
  if (!value || typeof value !== 'object') {
    return false
  }
  const item = value as Partial<PlaygroundMessage>
  return typeof item.id === 'string' && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string' && typeof item.createdAt === 'number'
}

/** Drop trailing empty assistant bubbles left by an interrupted stream. */
export function sanitizeMessages(messages: PlaygroundMessage[]): PlaygroundMessage[] {
  const next = [...messages]
  while (next.length > 0) {
    const last = next[next.length - 1]
    if (last.role === 'assistant' && !last.content.trim()) {
      next.pop()
      continue
    }
    break
  }
  return next
}

export function loadMessages(): PlaygroundMessage[] {
  if (typeof window === 'undefined') {
    return []
  }

  const raw = readString(STORAGE_KEYS.messages)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }
    return sanitizeMessages(parsed.filter(isPlaygroundMessage))
  } catch {
    return []
  }
}

export function saveMessages(messages: PlaygroundMessage[]) {
  if (typeof window === 'undefined') {
    return
  }

  const payload = sanitizeMessages(messages)
  try {
    writeString(STORAGE_KEYS.messages, JSON.stringify(payload))
  } catch {
    // Quota exceeded (often large images): retry without image payloads.
    const withoutImages = payload.map((message) => {
      if (!message.image) {
        return message
      }
      const { image, ...rest } = message
      void image
      return rest
    })
    try {
      writeString(STORAGE_KEYS.messages, JSON.stringify(withoutImages))
    } catch {
      // ignore — keep in-memory chat only
    }
  }
}

export function clearMessages() {
  removeKey(STORAGE_KEYS.messages)
}

/** Normalize Google model resource name to bare id. */
export function stripModelPrefix(name: string) {
  return name.replace(/^models\//, '')
}

export function isModelsCacheFresh(fetchedAt: number, now = Date.now()) {
  return now - fetchedAt < MODELS_CACHE_TTL_MS
}

/** Load cached model ids for this apiRoot when still within TTL. */
export function loadModelsCache(apiRoot: string, now = Date.now()): string[] | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = readString(STORAGE_KEYS.modelsCache)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as ModelsCachePayload
    if (!parsed || parsed.apiRoot !== apiRoot || !Array.isArray(parsed.models)) {
      return null
    }
    if (!isModelsCacheFresh(parsed.fetchedAt, now)) {
      return null
    }
    return parsed.models.filter((item) => typeof item === 'string' && item.length > 0)
  } catch {
    return null
  }
}

export function saveModelsCache(apiRoot: string, models: string[], fetchedAt = Date.now()) {
  const payload: ModelsCachePayload = { apiRoot, models, fetchedAt }
  writeString(STORAGE_KEYS.modelsCache, JSON.stringify(payload))
}

export function clearModelsCache() {
  removeKey(STORAGE_KEYS.modelsCache)
}
