import { ProcessTransformStream } from './libs/ProcessTransformStream'
import { createContext } from './createContext'
import { handleRequest } from './handleRequest'
import { createErrorResponse } from './libs/response'

export default async function proxy(request: Request & { nextUrl?: URL }) {
  const context = createContext(request)
  const { logger } = context

  const responseStream = new ProcessTransformStream()
  responseStream.process(({ message }) => logger.response.info(message))

  try {
    return handleRequest(context)
  } catch (error) {
    return createErrorResponse(error, 500, { statusText: 'system error' })
  }
}
