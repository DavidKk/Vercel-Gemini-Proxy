import { loadAuthEnv, resolveUpstreamAuth } from '@/services/gemini/auth'
import { CORS_HEADERS, GOOGLE_GEMINI_API_URL, TIMEOUT } from '@/services/gemini/constants'
import type { Context } from '@/services/gemini/createContext'
import { extractTotalTokenCountFromBody, pickKeyLeastTokensToday, recordTokenUsage } from '@/services/gemini/keyRotation'
import { ProcessTransformStream } from '@/services/gemini/libs/ProcessTransformStream'
import { createErrorResponse, createOfficialGeminiErrorResponse, createResponse, passthroughUpstreamErrorResponse } from '@/services/gemini/libs/response'
import { type WebWritableStream, WritableStream } from '@/services/gemini/libs/TransformStream'
import { sanitizeGeminiToolParametersInPayload } from '@/services/gemini/sanitizeGeminiToolParameters'
import { isValidTrailingContentRole, type Message } from '@/services/gemini/types/message'
import { convertStringToUint8Array } from '@/services/gemini/utils/convertStringToUint8Array'
import { getContentLength } from '@/services/gemini/utils/getContentLength'
import { pickHeaders } from '@/services/gemini/utils/pickHeaders'

const METHODS_WITH_JSON_BODY = new Set(['POST', 'PUT', 'PATCH'])

/** Redact secrets before logging headers / query / URLs. */
export function redactForLog(value: unknown, secretHeaderNames: string[] = []): unknown {
  const secretNames = new Set(secretHeaderNames.map((name) => name.toLowerCase()))

  const redact = (input: unknown): unknown => {
    if (typeof input === 'string') {
      try {
        const url = new URL(input)
        if (url.searchParams.has('key')) {
          url.searchParams.set('key', '[redacted]')
        }
        return url.toString()
      } catch {
        return input
      }
    }

    if (!input || typeof input !== 'object') {
      return input
    }

    if (Array.isArray(input)) {
      return input.map((item) => redact(item))
    }

    const record = input as Record<string, unknown>
    const next: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(record)) {
      if (/^(key|api[_-]?key|x-goog-api-key|authorization)$/i.test(key) || secretNames.has(key.toLowerCase())) {
        next[key] = '[redacted]'
        continue
      }
      if (key === 'headers' && entry && typeof entry === 'object' && !Array.isArray(entry)) {
        const headers: Record<string, unknown> = {}
        for (const [headerKey, headerValue] of Object.entries(entry as Record<string, unknown>)) {
          headers[headerKey] = /api[_-]?key|authorization/i.test(headerKey) || secretNames.has(headerKey.toLowerCase()) ? '[redacted]' : headerValue
        }
        next[key] = headers
        continue
      }
      next[key] = redact(entry)
    }
    return next
  }

  return redact(value)
}

function isSupportedGeminiPath(pathname: string) {
  // /api/v1, /api/v1beta, /api/v1beta2, ...
  return pathname === '/api/v1' || pathname.startsWith('/api/v1/') || pathname.startsWith('/api/v1beta')
}

/** Handle the incoming Gemini proxy request. */
export async function handleRequest(context: Context) {
  const { request, logger } = context
  const { method, nextUrl, url } = request
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const requestUrl = nextUrl ? nextUrl : new URL(url)
  const { pathname, searchParams } = requestUrl
  const params = Object.fromEntries(searchParams.entries())
  const authEnv = loadAuthEnv()
  const secretHeaderNames = authEnv.proxyAuthHeaders.map((pair) => pair.name)

  logger.request.info(`Use ${method.toUpperCase()} to request ${pathname} with search ${JSON.stringify(redactForLog(params, secretHeaderNames), null, 2)}`)

  const { headers: reqHeaders, body } = request

  if (!isSupportedGeminiPath(pathname)) {
    return createErrorResponse('No permission', 401)
  }

  const authResult = resolveUpstreamAuth(reqHeaders, searchParams, authEnv)
  if (!authResult.ok) {
    return createErrorResponse(authResult.message, authResult.status)
  }

  const auth =
    authResult.mode === 'proxy'
      ? {
          ...authResult,
          geminiApiKey: await pickKeyLeastTokensToday(authEnv.geminiApiKeys),
        }
      : authResult

  const needsJsonBody = METHODS_WITH_JSON_BODY.has(method.toUpperCase())
  if (needsJsonBody && !body) {
    logger.request.fail('Proxy failed: body is empty.')
    return createErrorResponse('Proxy failed: body is empty.', 403)
  }

  const readBody = async (): Promise<Message> => {
    const requestStream = new ProcessTransformStream()
    requestStream.process(({ message }) => logger.request.info(message))
    requestStream.setContentSize(getContentLength(reqHeaders))

    const writableStream = new WritableStream()
    await body!.pipeThrough(requestStream).pipeTo(writableStream)
    const { content } = requestStream

    try {
      return JSON.parse(content)
    } catch (error) {
      const reason = error instanceof Error ? error?.message : error?.toString()
      const message = 'Proxy failed: request content is invalid json.'
      logger.request.fail(`${message}\nReason: ${reason}\nValue: ${content}`)
      throw new Error(message)
    }
  }

  /**
   * For generateContent-style payloads, lightly fix multiturn role order.
   * Interactions / other endpoints without `contents` are forwarded as-is.
   */
  let payload: Message | undefined
  if (body) {
    payload = await readBody()

    if (Array.isArray(payload.contents) && payload.contents.length > 0) {
      const firstContent = payload.contents.at(0)
      if (firstContent?.role && firstContent.role !== 'user') {
        payload.contents.splice(0, 1)
        logger.request.warn('First message in the payload does not have the role of "user". It has been removed.')
      }

      const lastContent = payload.contents.at(-1)
      if (lastContent && !isValidTrailingContentRole(lastContent.role)) {
        logger.response.warn(`The last message in the payload does not have a valid trailing role ("user" | "function"). role=${lastContent.role}`)
        return createResponse(lastContent || null)
      }
    }

    // Gemini functionDeclarations.parameters is a proto Schema subset; clients often send
    // full JSON Schema (e.g. additionalProperties). Strip known-invalid keys before forward.
    if (sanitizeGeminiToolParametersInPayload(payload as unknown as Record<string, unknown>)) {
      logger.request.info('Stripped Gemini-incompatible keys from tools.*.parameters (e.g. additionalProperties).')
    }
  }

  const proxyPath = pathname.replace(/^\/api/, '')
  const proxyUrl = new URL(proxyPath, GOOGLE_GEMINI_API_URL)
  searchParams.delete('_path')
  if (auth.mode === 'proxy') {
    // Never forward client Gemini credentials in proxy mode.
    searchParams.delete('key')
  }
  searchParams.forEach((value, key) => proxyUrl.searchParams.append(key, value))
  logger.request.info(`Request "${redactForLog(requestUrl.toString(), secretHeaderNames)}" proxy to "${redactForLog(proxyUrl.toString(), secretHeaderNames)}" (auth=${auth.mode}).`)

  // Do not forward request Content-Length: body is re-serialized, and echoing CL onto the
  // client Response truncates SSE streams (browser stops at request-body byte length).
  const upstreamHeaders = pickHeaders(reqHeaders, [/Content\-Type/i, 'x-goog-api-client', 'x-goog-api-key'])
  if (auth.mode === 'proxy') {
    upstreamHeaders['x-goog-api-key'] = auth.geminiApiKey
  }

  const isSse = searchParams.get('alt') === 'sse'
  const clientHeaders: Record<string, string> = {
    ...CORS_HEADERS,
    'Content-Type': isSse ? 'text/event-stream; charset=utf-8' : 'application/json',
    'Cache-Control': 'no-cache, no-transform',
  }
  const responseStream = new ProcessTransformStream()
  responseStream.process(({ message }) => logger.response.info(message))

  const requestStartTime = Date.now()
  const controller = new AbortController()
  const handleTimeout = () => {
    const reason = new Error(`The request timed out after ${(TIMEOUT / 1e3).toFixed(0)}s.`)
    logger.request.fail(reason.message)
    return controller.abort(reason)
  }

  const timeoutId = setTimeout(handleTimeout, TIMEOUT)

  const clientSignal = request.signal
  const onClientAbort = () => {
    clearTimeout(timeoutId)
    if (!controller.signal.aborted) {
      controller.abort(clientSignal.reason ?? new Error('Client disconnected'))
    }
  }
  if (clientSignal.aborted) {
    onClientAbort()
  } else {
    clientSignal.addEventListener('abort', onClientAbort, { once: true })
  }

  const fetchOptions: RequestInit = {
    method,
    headers: upstreamHeaders,
    body: typeof payload === 'undefined' ? undefined : JSON.stringify(payload),
    signal: controller.signal,
  }

  const logFetchOptions = {
    method: fetchOptions.method,
    headers: redactForLog(upstreamHeaders, secretHeaderNames),
    body: typeof payload === 'undefined' ? undefined : '[omitted]',
    hasSignal: true,
  }

  const safeCloseWriter = async (writer: WritableStreamDefaultWriter<any>) => {
    try {
      await writer.close()
    } catch {
      // already closed / errored
    }
    try {
      writer.releaseLock()
    } catch {
      // already released
    }
  }

  const safeAbortWriter = async (writer: WritableStreamDefaultWriter<any>, reason?: unknown) => {
    try {
      await writer.abort(reason)
    } catch {
      // ignore
    }
    try {
      writer.releaseLock()
    } catch {
      // ignore
    }
  }

  const isAbortError = (error: unknown): boolean =>
    (error instanceof Error && error.name === 'AbortError') ||
    (typeof error === 'object' && error !== null && 'name' in error && (error as { name: string }).name === 'AbortError') ||
    /aborted|abort/i.test(error instanceof Error ? error.message : String(error ?? ''))

  /**
   * Pipe a successful upstream body into the client stream (status already chosen).
   * Keeps ProcessTransformStream logging / token accounting.
   */
  const pipeUpstreamSuccessBody = async (stream: WebWritableStream, response: Response) => {
    if (stream.locked) {
      logger.response.fail('Proxy response stream already locked; skip write.')
      return
    }

    const writer = stream.getWriter()
    const responseBody = response.body
    if (!responseBody) {
      await safeAbortWriter(writer, new Error('Upstream body missing after ok status'))
      return
    }

    try {
      const responseStartTime = Date.now()
      const reader = responseBody.getReader()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }

          await writer.ready
          await writer.write(convertStringToUint8Array(value))
        }
      } finally {
        try {
          reader.releaseLock()
        } catch {
          // ignore
        }
      }

      await safeCloseWriter(writer)
      logger.response.info(`Response spent ${((Date.now() - responseStartTime) / 1e3).toFixed(3)} s.`)

      if (auth.mode === 'proxy') {
        const totalTokens = extractTotalTokenCountFromBody(responseStream.content)
        if (totalTokens !== null) {
          void recordTokenUsage(auth.geminiApiKey, totalTokens)
        }
      }
    } catch (error) {
      if (isAbortError(error)) {
        logger.response.info('Proxy stream aborted (client disconnected).')
      } else {
        const message = error instanceof Error ? error.message : String(error)
        logger.response.fail(`Proxy failed with some errors.\n${message}`)
      }
      await safeAbortWriter(writer, error)
    }
  }

  logger.request.info(`Proxy request ${redactForLog(proxyUrl.toString(), secretHeaderNames)} with options ${JSON.stringify(logFetchOptions, null, 2)}.`)

  try {
    const upstream = await fetch(proxyUrl, fetchOptions)
    clearTimeout(timeoutId)
    clientSignal.removeEventListener('abort', onClientAbort)

    logger.request.info(`Request spent ${((Date.now() - requestStartTime) / 1e3).toFixed(3)}s. upstreamStatus=${upstream.status}`)
    responseStream.setContentSize(getContentLength(upstream.headers))

    // Match official Generative Language API: non-2xx keeps status + error JSON body.
    if (!upstream.ok) {
      const result = upstream.body ? await upstream.text() : ''
      logger.response.fail(`Upstream failed with status ${upstream.status}. body=${result.slice(0, 500)}`)
      return passthroughUpstreamErrorResponse(upstream, result)
    }

    if (!upstream.body) {
      logger.response.fail(`Upstream ${upstream.status} returned an empty body.`)
      return createOfficialGeminiErrorResponse(502, 'Upstream returned an empty body.', 'UNAVAILABLE')
    }

    logger.response.info('proxy stream start.')
    void pipeUpstreamSuccessBody(responseStream.writable, upstream)
    return new Response(responseStream.readable, {
      status: upstream.status,
      statusText: upstream.statusText || 'ok',
      headers: clientHeaders,
    })
  } catch (error) {
    clearTimeout(timeoutId)
    clientSignal.removeEventListener('abort', onClientAbort)

    if (isAbortError(error)) {
      const timedOut = controller.signal.aborted && /timed out/i.test(String(controller.signal.reason ?? error))
      if (timedOut) {
        const message = error instanceof Error ? error.message : `The request timed out after ${(TIMEOUT / 1e3).toFixed(0)}s.`
        logger.response.fail(`Upstream fetch timed out.\n${message}`)
        return createOfficialGeminiErrorResponse(504, message, 'DEADLINE_EXCEEDED')
      }

      logger.response.info('Upstream fetch aborted (client disconnect).')
      return createOfficialGeminiErrorResponse(499, 'Client disconnected before the upstream response completed.', 'CANCELLED')
    }

    const message = error instanceof Error ? error.message : String(error)
    logger.response.fail(`Proxy failed with some errors.\n${message}`)
    return createOfficialGeminiErrorResponse(502, message, 'UNAVAILABLE')
  }
}
