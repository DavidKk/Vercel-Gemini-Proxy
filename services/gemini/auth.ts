export type ProxyAuthHeader = {
  name: string
  value: string
}

export type AuthEnv = {
  /** Custom proxy auth headers (name+value). Empty = proxy mode disabled. */
  proxyAuthHeaders: ProxyAuthHeader[]
  geminiApiKey: string
}

export type UpstreamAuthSuccess =
  | {
      ok: true
      mode: 'proxy'
      geminiApiKey: string
    }
  | {
      ok: true
      mode: 'passthrough'
      geminiApiKey: string
      credentialSource: 'query' | 'header'
    }

export type UpstreamAuthFailure = {
  ok: false
  status: number
  message: string
}

export type UpstreamAuthResult = UpstreamAuthSuccess | UpstreamAuthFailure

/**
 * Parse `PROXY_AUTH_HEADERS` env as a JSON object of header name → value.
 * Example: `{"X-API-KEY":"secret","x-extra":"other"}`
 * All entries must match (AND). Invalid / empty JSON → no proxy headers configured.
 */
export function parseProxyAuthHeaders(raw: string): ProxyAuthHeader[] {
  const text = raw.trim()
  if (!text) {
    return []
  }

  try {
    const parsed = JSON.parse(text) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return []
    }

    const pairs: ProxyAuthHeader[] = []
    for (const [name, value] of Object.entries(parsed as Record<string, unknown>)) {
      const headerName = name.trim()
      const headerValue = typeof value === 'string' ? value.trim() : ''
      if (!headerName || !headerValue) {
        continue
      }
      pairs.push({ name: headerName, value: headerValue })
    }
    return pairs
  } catch {
    return []
  }
}

/** Read auth-related env vars (trimmed). */
export function loadAuthEnv(env: NodeJS.ProcessEnv = process.env): AuthEnv {
  return {
    proxyAuthHeaders: parseProxyAuthHeaders(env.PROXY_AUTH_HEADERS ?? ''),
    geminiApiKey: (env.GEMINI_API_KEY ?? '').trim(),
  }
}

function requestHasAnyProxyHeader(headers: Headers, pairs: ProxyAuthHeader[]): boolean {
  return pairs.some((pair) => {
    const value = headers.get(pair.name)
    return value !== null && value.trim() !== ''
  })
}

function requestMatchesAllProxyHeaders(headers: Headers, pairs: ProxyAuthHeader[]): boolean {
  return pairs.every((pair) => headers.get(pair.name)?.trim() === pair.value)
}

/**
 * Resolve upstream Gemini credentials.
 * - If any configured custom proxy header is present → proxy mode (all pairs must match; server GEMINI_API_KEY).
 * - Else → passthrough client `?key=` or `x-goog-api-key`.
 */
export function resolveUpstreamAuth(headers: Headers, searchParams: URLSearchParams, env: AuthEnv): UpstreamAuthResult {
  const pairs = env.proxyAuthHeaders

  if (pairs.length > 0 && requestHasAnyProxyHeader(headers, pairs)) {
    if (!requestMatchesAllProxyHeaders(headers, pairs)) {
      return { ok: false, status: 401, message: 'No permission' }
    }
    if (!env.geminiApiKey) {
      return { ok: false, status: 503, message: 'Server Gemini API key is not configured' }
    }
    return { ok: true, mode: 'proxy', geminiApiKey: env.geminiApiKey }
  }

  const queryKey = searchParams.get('key')?.trim() ?? ''
  if (queryKey) {
    return { ok: true, mode: 'passthrough', geminiApiKey: queryKey, credentialSource: 'query' }
  }

  const headerKey = headers.get('x-goog-api-key')?.trim() ?? ''
  if (headerKey) {
    return { ok: true, mode: 'passthrough', geminiApiKey: headerKey, credentialSource: 'header' }
  }

  return { ok: false, status: 401, message: 'No permission' }
}
