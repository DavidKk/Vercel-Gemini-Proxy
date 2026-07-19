import { createException } from './createException'

export function createErrorResponse(content: unknown, status: number, init?: Omit<ResponseInit, 'status'>) {
  const exception = createException(
    (() => {
      if (typeof content === 'string') {
        return content
      }

      if (content instanceof Error) {
        return content.message
      }

      if (typeof content === 'object') {
        return JSON.stringify(content)
      }

      if (typeof content !== 'undefined' && typeof content?.toString === 'function') {
        return content?.toString()
      }

      return 'unknow error'
    })()
  )

  return new Response(JSON.stringify(exception), { status, ...init })
}
