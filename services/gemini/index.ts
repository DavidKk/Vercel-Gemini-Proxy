import { createContext } from '@/services/gemini/createContext'
import { handleRequest } from '@/services/gemini/handleRequest'
import { createErrorResponse } from '@/services/gemini/libs/response'

export type GeminiApiVersion = 'v1' | 'v1beta' | 'v1beta2'
export type GeminiRouteParams = { path: string[] }

/**
 * App Router entry for Gemini Generative Language paths.
 * Rebuilds the public URL so handleRequest pathname logic stays unchanged.
 */
export async function handleGeminiProxy(request: Request, apiVersion: GeminiApiVersion, params: GeminiRouteParams) {
  const { path = [] } = params
  const incoming = new URL(request.url)
  const pathname = path.length > 0 ? `/api/${apiVersion}/${path.join('/')}` : `/api/${apiVersion}`
  const url = new URL(pathname + incoming.search, incoming.origin)

  const proxied = new Request(url, request) as Request & { nextUrl?: URL }
  proxied.nextUrl = url

  const context = createContext(proxied)
  try {
    return await handleRequest(context)
  } catch (error) {
    return createErrorResponse(error, 500, { statusText: 'system error' })
  }
}

type RouteContext = { params: Promise<{ path: string[] }> }

/** Shared GET/POST/... exports for App Router route files. */
export function createGeminiRouteHandlers(apiVersion: GeminiApiVersion) {
  const handle = async (request: Request, context: RouteContext) => handleGeminiProxy(request, apiVersion, await context.params)

  return {
    GET: handle,
    POST: handle,
    PUT: handle,
    PATCH: handle,
    DELETE: handle,
    OPTIONS: handle,
  }
}
