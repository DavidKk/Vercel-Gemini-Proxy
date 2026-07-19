export const GOOGLE_GEMINI_API_URL = 'https://generativelanguage.googleapis.com'

export const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': '*',
  'access-control-allow-headers': '*',
}

/** Business abort timeout; keep aligned with route `maxDuration` (120s). */
export const TIMEOUT = 120e3
