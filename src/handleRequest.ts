import { WritableStream, type WebWritableStream } from './libs/TransformStream'
import { ProcessTransformStream } from './libs/ProcessTransformStream'
import { getContentLength } from './utils/getContentLength'
import { pickHeaders } from './utils/pickHeaders'
import { convertStringToUint8Array } from './utils/convertStringToUint8Array'
import { GOOGLE_GEMINI_API_URL, TIMEOUT } from './constants/conf'
import type { Message } from './types/message'
import type { Context } from './createContext'
import { createErrorResponse, createException, createResponse } from './libs/response'

/** Handle the incoming request. */
export async function handleRequest(context: Context) {
  const { request, logger } = context
  const { method, nextUrl, url } = request
  if (method === 'OPTIONS') {
    return createErrorResponse(null, 500)
  }

  const requestUrl = nextUrl ? nextUrl : new URL(url)
  const { pathname, searchParams } = requestUrl
  const params = Object.fromEntries(
    (function* () {
      for (const item of searchParams.entries()) {
        yield item
      }
    })()
  )

  logger.request.info(`Use ${method.toUpperCase()} to request ${pathname} with search ${JSON.stringify(params, null, 2)}`)

  // The address must contain /v1 or /v1beta,
  // otherwise it is definitely not a request to gemini,
  // and it must contain a token,
  // otherwise it definitely does not have permission.
  if (!searchParams.has('key') || !(pathname.startsWith('/api/v1') || pathname.startsWith('/api/v1beta'))) {
    return createErrorResponse('No permission', 401)
  }

  // The content of the request cannot be empty.
  const { headers: reqHeaders, body } = request
  if (!body) {
    logger.request.fail('Proxy failed: body is empty.')
    return createErrorResponse('Proxy failed: body is empty.', 403)
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
    logger.response.warn('The last message in the payload does not have the role of "user".')
    return createResponse(lastContent || null)
  }

  const proxyPath = pathname.replace(/^\/api/, '')
  const proxyUrl = new URL(proxyPath, GOOGLE_GEMINI_API_URL)
  searchParams.delete('_path')
  searchParams.forEach((value, key) => proxyUrl.searchParams.append(key, value))
  logger.request.info(`Request "${requestUrl.toString()}" proxy to "${proxyUrl.toString()}".`)

  const headers = pickHeaders(reqHeaders, [/Content\-Type/i, /Content\-Length/i, 'x-goog-api-client', 'x-goog-api-key'])
  const responseStream = new ProcessTransformStream()
  responseStream.process(({ message }) => logger.response.info(message))

  const requestStartTime = Date.now()
  const controller = new AbortController()
  const handleTimeout = () => {
    const reason = new Error(`The request timed out for more than ${(TIMEOUT / 1e3).toFixed(2)}m.`)
    logger.request.fail(reason.message)
    return controller.abort(reason)
  }

  const timeoutId = setTimeout(handleTimeout, TIMEOUT)
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
      const exception = createException('Nothing response.')
      await write(exception.toJson())
      return
    }

    if (400 <= status || status > 200) {
      const result = await response.text()
      const message = `Proxy failed with status code ${status}. reason:${result}`
      const exception = createException(message)

      logger.response.fail(`${message}\nResponse content is ${result}.`)
      await write(exception.toJson())
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
    await writer.write(exception.toJson())
    await writer.close()
  }

  logger.request.info(`Proxy request ${proxyUrl} with options ${JSON.stringify(fetchOptions, null, 2)}.`)
  fetch(proxyUrl, fetchOptions)
    .then(async (response) => {
      clearTimeout(timeoutId)

      logger.request.info(`Request spent ${((Date.now() - requestStartTime) / 1e3).toFixed(3)}s.`)
      responseStream.setContentSize(getContentLength(response.headers))

      const handleResponse = writeResponseToWritableStream(responseStream.writable)
      await handleResponse(response)
    })
    .catch(async (error) => {
      logger.response.fail(`Proxy failed with some errors.\n${error}`)

      if (responseStream.writable.locked) {
        logger.response.fail('Close the response stream.')
        responseStream.writable.getWriter().releaseLock()
      }

      clearTimeout(timeoutId)

      const handleResponse = writeErrorToWritableStream(responseStream.writable)
      await handleResponse(error)
    })

  logger.response.info('proxy stream start.')
  return new Response(responseStream.readable, { status: 200, statusText: 'ok', headers })
}
