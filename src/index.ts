import { ProcessTransformStream } from './libs/ProcessTransformStream'
import { createContext } from './createContext'
import { createException } from './createException'
import { handleRequest } from './handleRequest'

export default async (request: Request & { nextUrl?: URL }) => {
  const context = createContext(request)
  const { logger } = context

  const responseStream = new ProcessTransformStream()
  responseStream.process(({ message }) => logger.response.info(message))

  try {
    const response = await handleRequest(context)
    return response
  } catch (error) {
    const body = createException(error instanceof Error ? error.message : error!.toString())
    return new Response(JSON.stringify(body), { status: 500, statusText: 'system error' })
  }
}
