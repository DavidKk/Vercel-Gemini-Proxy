import { CORS_HEADERS } from '@/services/gemini/constants'

/** Map HTTP status to a Gemini-style `error.status` enum string. */
export function geminiErrorStatusName(httpStatus: number): string {
  switch (httpStatus) {
    case 400:
      return 'INVALID_ARGUMENT'
    case 401:
      return 'UNAUTHENTICATED'
    case 403:
      return 'PERMISSION_DENIED'
    case 404:
      return 'NOT_FOUND'
    case 429:
      return 'RESOURCE_EXHAUSTED'
    case 499:
      return 'CANCELLED'
    case 500:
      return 'INTERNAL'
    case 503:
      return 'UNAVAILABLE'
    case 504:
      return 'DEADLINE_EXCEEDED'
    default:
      return httpStatus >= 500 ? 'INTERNAL' : 'INVALID_ARGUMENT'
  }
}

/**
 * Build a Response shaped like the official Generative Language API error body.
 * Used for proxy-local failures (timeout, empty upstream body, network errors).
 * Upstream 4xx/5xx should prefer passthrough of the original body + status.
 * @param httpStatus HTTP status to return
 * @param message Error message
 * @param statusName Optional Gemini `error.status` string
 * @returns Response with `{ error: { code, message, status } }`
 */
export function createOfficialGeminiErrorResponse(httpStatus: number, message: string, statusName?: string): Response {
  const body = {
    error: {
      code: httpStatus,
      message,
      status: statusName ?? geminiErrorStatusName(httpStatus),
    },
  }

  return new Response(JSON.stringify(body), {
    status: httpStatus,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-transform',
    },
  })
}

/**
 * Passthrough an upstream Gemini error Response: keep status + body, add CORS.
 * @param upstream Upstream fetch Response (!ok)
 * @param bodyText Already-read response text (may be empty)
 * @returns Client Response aligned with official API status semantics
 */
export function passthroughUpstreamErrorResponse(upstream: Response, bodyText: string): Response {
  const contentType = upstream.headers.get('Content-Type') || 'application/json'
  const body =
    bodyText.trim() ||
    JSON.stringify({
      error: {
        code: upstream.status,
        message: `Upstream returned empty error body (${upstream.status}).`,
        status: geminiErrorStatusName(upstream.status),
      },
    })

  return new Response(body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-transform',
    },
  })
}
