import { parseGeminiApiKeys } from '@/services/gemini/keyRotation'

export type ProxyAuthHeader = {
  name: string
  value: string
}

export type AuthEnv = {
  /** Custom proxy auth headers (name+value). Empty = proxy mode disabled. */
  proxyAuthHeaders: ProxyAuthHeader[]
  /**
   * Server Gemini key pool for proxy mode (`GEMINI_API_KEYS` JSON array).
   * One or more keys; with Vercel KV, least-tokens-today picks among them.
   */
  geminiApiKeys: string[]
  /** First key in the pool (compat); empty when pool is empty. */
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
export function loadAuthEnv(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): AuthEnv {
  const geminiApiKeys = parseGeminiApiKeys(env)
  return {
    proxyAuthHeaders: parseProxyAuthHeaders(env.PROXY_AUTH_HEADERS ?? ''),
    geminiApiKeys,
    geminiApiKey: geminiApiKeys[0] ?? '',
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
 * - If any configured custom proxy header is present → proxy mode (all pairs must match; server key pool).
 * - Else → passthrough client `?key=` or `x-goog-api-key`.
 * Proxy success returns the first pool key; callers may replace via `pickKeyLeastTokensToday`.
 */
export function resolveUpstreamAuth(headers: Headers, searchParams: URLSearchParams, env: AuthEnv): UpstreamAuthResult {
  const pairs = env.proxyAuthHeaders

  if (pairs.length > 0 && requestHasAnyProxyHeader(headers, pairs)) {
    if (!requestMatchesAllProxyHeaders(headers, pairs)) {
      return { ok: false, status: 401, message: 'No permission' }
    }
    if (env.geminiApiKeys.length === 0) {
      return { ok: false, status: 503, message: 'Server Gemini API key is not configured' }
    }
    return { ok: true, mode: 'proxy', geminiApiKey: env.geminiApiKeys[0] }
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

/**
 * Auth for HTTP MCP (`/api/mcp`).
 * Proxy headers only — never accepts client Gemini key passthrough.
 * Requires `PROXY_AUTH_HEADERS` configured on the server.
 */
export function resolveMcpAuth(headers: Headers, env: AuthEnv): UpstreamAuthResult {
  const pairs = env.proxyAuthHeaders
  if (pairs.length === 0) {
    return {
      ok: false,
      status: 503,
      message: 'MCP requires PROXY_AUTH_HEADERS (proxy mode)',
    }
  }

  if (!requestHasAnyProxyHeader(headers, pairs) || !requestMatchesAllProxyHeaders(headers, pairs)) {
    return { ok: false, status: 401, message: 'No permission' }
  }

  if (env.geminiApiKeys.length === 0) {
    return { ok: false, status: 503, message: 'Server Gemini API key is not configured' }
  }

  return { ok: true, mode: 'proxy', geminiApiKey: env.geminiApiKeys[0] }
}
