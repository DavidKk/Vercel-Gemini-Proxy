export type PlaygroundImageMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

export type PlaygroundImage = {
  mimeType: PlaygroundImageMime
  /** data URL for preview and in-session echo */
  dataUrl: string
}

/** Parsed from Gemini `usageMetadata` on generate/stream responses. */
export type PlaygroundUsageMetadata = {
  promptTokenCount: number
  candidatesTokenCount: number
  totalTokenCount: number
  thoughtsTokenCount?: number
}

export type PlaygroundMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** User-attached image only; never set on assistant messages. */
  image?: PlaygroundImage
  /** Grounding sources from Google Search (assistant only). */
  sources?: PlaygroundGroundingSource[]
  /** Token usage for this assistant turn (from chunks that include usageMetadata). */
  usage?: PlaygroundUsageMetadata
  createdAt: number
}

export type PlaygroundGroundingSource = {
  title: string
  uri: string
}

export type PlaygroundSendPayload = {
  text: string
  image?: PlaygroundImage
}

export const PLAYGROUND_IMAGE_MIMES: readonly PlaygroundImageMime[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/** Max image size for inline_data uploads (4 MiB). */
export const PLAYGROUND_IMAGE_MAX_BYTES = 4 * 1024 * 1024

export type PlaygroundSettings = {
  apiKey: string
  useCustomBaseUrl: boolean
  baseUrl: string
  modelId: string
  /** When true, requests include Gemini Google Search grounding. */
  googleSearch: boolean
}

export type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } }

export type GeminiContent = {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

export type ModelsCachePayload = {
  apiRoot: string
  models: string[]
  fetchedAt: number
}

export const DEFAULT_PLAYGROUND_SETTINGS: PlaygroundSettings = {
  apiKey: '',
  useCustomBaseUrl: false,
  baseUrl: '',
  modelId: '',
  googleSearch: false,
}

export const STORAGE_KEYS = {
  apiKey: 'vgp_playground_api_key',
  useCustomBaseUrl: 'vgp_playground_use_custom_base',
  baseUrl: 'vgp_playground_base_url',
  modelId: 'vgp_playground_model',
  googleSearch: 'vgp_playground_google_search',
  modelsCache: 'vgp_playground_models_cache',
  messages: 'vgp_playground_messages',
} as const

export const DEFAULT_API_ROOT = '/api/v1beta'

/** Model list cache TTL: 1 day. */
export const MODELS_CACHE_TTL_MS = 24 * 60 * 60 * 1000
