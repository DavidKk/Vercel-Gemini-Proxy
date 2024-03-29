import { WritableStream, type WebWritableStream } from './libs/TransformStream'
import { ProcessTransformStream } from './libs/ProcessTransformStream'
import { getContentLength } from './utils/getContentLength'
import { pickHeaders } from './utils/pickHeaders'
import { convertStringToUint8Array } from './utils/convertStringToUint8Array'
import { GOOGLE_GEMINI_API_URL, CORS_HEADERS, TIMEOUT } from './constants/conf'
import type { Message } from './types/message'
import { createException } from './createException'
import type { Context } from './createContext'

const createErrorResponse = (content: string | Record<string, any> | null, status = 401) => {
  const { headers, body } = (() => {
    if (content === null) {
      return { headers: undefined, body: null }
    }

    if (typeof content === 'object') {
      const headers = { 'Content-Type': 'application/json' }
      const body = JSON.stringify(content)
      return { headers, body }
    }

    const headers = { 'Content-Type': 'text/html' }
    const body = content
    return { headers, body }
  })()

  return new Response(body, { status, headers: { ...CORS_HEADERS, ...headers } })
}

/**
 * Handle the incoming request.
 * @param context The context of the request.
 */
export const handleRequest = async (context: Context) => {
  const { request, logger } = context
  const { method, nextUrl, url } = request
  if (method === 'OPTIONS') {
    return createErrorResponse(null)
  }

  const requestUrl = nextUrl ? nextUrl : new URL(url)
  const { pathname, searchParams } = requestUrl
  logger.request.info(`Use ${method.toUpperCase()} to request ${pathname} with search ${JSON.stringify(searchParams, null, 2)}`)

  // The address must contain /v1 or /v1beta, otherwise it is definitely not a request to gemini, and it must contain a token, otherwise it definitely does not have permission.
  if (!searchParams.has('key') || !(pathname.startsWith('/v1') || pathname.startsWith('/v1beta'))) {
    return createErrorResponse('No permission')
  }

  // The content of the request cannot be empty.
  const { headers: reqHeaders, body } = request
  if (!body) {
    return createErrorResponse('Proxy failed: body is empty.')
  }

  const readBody = async (): Promise<Message> => {
    const requestStream = new ProcessTransformStream()
    requestStream.process(({ message }) => logger.request.info(message))
    requestStream.setContentSize(getContentLength(reqHeaders))

    const writableStream = new WritableStream()
    await body.pipeThrough(requestStream).pipeTo(writableStream)
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
   * Read the body content in advance to determine if the data inside is incorrect.
   * Because the data is relatively strict, if an error occurs,
   * it can be discarded to reduce requests.
   */
  const payload = await readBody()
  const firstContnet = payload?.contents.at(0)
  /**
   * If the role of the first and last message is not `user`,
   * the error `Please ensure that multiturn requests ends with a user role or a function response.`
   * will occur.
   */
  if (firstContnet?.role !== 'user') {
    payload.contents.splice(0, 1)
    logger.request.warn('First message in the payload does not have the role of "user". It has been removed.')
  }

  /**
   * The last one is the current question,
   * it must be meaningful,
   * otherwise it will be interrupted.
   */
  const lastContent = payload?.contents?.at(-1)
  if (lastContent?.role !== 'user') {
    return new Response(JSON.stringify(lastContent), { status: 200, statusText: 'ok' })
  }

  const proxyUrl = new URL(pathname, GOOGLE_GEMINI_API_URL)
  searchParams.delete('_path')
  searchParams.forEach((value, key) => proxyUrl.searchParams.append(key, value))
  logger.request.info(`Request "${requestUrl.toString()}" proxy to "${proxyUrl.toString()}".`)

  const headers = pickHeaders(reqHeaders, [/Content\-Type/i, /Content\-Length/i, 'x-goog-api-client', 'x-goog-api-key'])
  const responseStream = new ProcessTransformStream()
  responseStream.process(({ message }) => logger.response.info(message))

  const requestStartTime = Date.now()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(new Error(`The request timed out for more than ${(TIMEOUT / 1e3).toFixed(2)}m.`)), TIMEOUT)
  const fetchOptions: RequestInit = {
    method,
    headers,
    body: JSON.stringify(payload),
    signal: controller.signal,
  }

  /**
   * Write the return value to the return stream.
   * Because vercel will interrupt in the middle,
   * so you need to return 200 first,
   * and then wait for gemini to return the result.
   */
  const writeResponseToWritableStream = (stream: WebWritableStream) => async (response: Response) => {
    const { status, body } = response
    const write = async (content: string) => {
      const writer = stream.getWriter()
      await writer.ready

      const value = convertStringToUint8Array(content)
      await writer.write(value)
      await writer.close()
      writer.releaseLock()
    }

    if (!body) {
      logger.response.fail(`Proxy failed with status code ${status}.\nResponse content is empty.`)
      await write(JSON.stringify({ message: 'Nothing response.' }))
      return
    }

    if (400 <= status || status > 200) {
      const result = await response.text()
      const message = `Proxy failed with status code ${status}.`
      logger.response.fail(`${message}\nResponse content is ${result}.`)
      await write(JSON.stringify({ failed: true, message, result }))
      return
    }

    const writer = stream.getWriter()
    try {
      const responseStartTime = Date.now()
      const reader = body.getReader()

      const read = async () => {
        const { done, value } = await reader.read()
        if (done) {
          await writer.close()
          writer.releaseLock()
          return
        }

        /**
         * @see https://github.com/vercel/next.js/issues/38736#issuecomment-1278917422
         */
        const content = convertStringToUint8Array(value)

        await writer.ready
        await writer.write(content)
        await read()
      }

      await read()

      logger.response.info(`Response spent ${((Date.now() - responseStartTime) / 1e3).toFixed(3)} s.`)
    } catch (error) {
      const message = error instanceof Error ? error?.message : error
      logger.response.fail(`Proxy failed with some errors.\n${message}`)

      await writer.ready
      await writer.write(JSON.stringify({ message }))
      await writer.close()
      writer.releaseLock()
    }
  }

  /** If there is an error in the middle, write the error information directly. */
  const writeErrorToWritableStream = (stream: WebWritableStream) => async (error: any) => {
    const message = error instanceof Error ? error.message : error?.toString()
    const writer = stream.getWriter()
    await writer.ready
    const exception = createException(message)
    await writer.write(JSON.stringify(exception))
    await writer.close()
  }

  /** Post-processing errors to prevent vercel from exiting in the middle. */
  fetch(proxyUrl, fetchOptions)
    .then(async (response) => {
      clearTimeout(timeoutId)

      logger.request.info(`Request spent ${((Date.now() - requestStartTime) / 1e3).toFixed(3)}s.`)
      responseStream.setContentSize(getContentLength(response.headers))

      const handleResponse = writeResponseToWritableStream(responseStream.writable)
      await handleResponse(response)
    })
    .catch(async (error) => {
      if (responseStream.writable.locked) {
        responseStream.writable.getWriter().releaseLock()
      }

      clearTimeout(timeoutId)

      const handleResponse = writeErrorToWritableStream(responseStream.writable)
      await handleResponse(error)
    })

  /**
   * Return 200 first, then wait for the gemini stream to return the result.
   */
  return new Response(responseStream.readable, { status: 200, statusText: 'ok', headers })
}
