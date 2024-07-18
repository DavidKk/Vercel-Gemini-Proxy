import { CORS_HEADERS } from '../../constants/conf'
import { getContentType } from './getContentType'
import { getResult } from './getResult'
import type { Content } from './types'

export function createResponse<T extends Content>(content: T, init?: ResponseInit) {
  const contentType = getContentType(content)

  const headers = {
    ...CORS_HEADERS,
    'content-type': contentType,
  }

  const body = (() => {
    if (typeof content === 'object') {
      const result = getResult(content)
      return JSON.stringify(result)
    }

    return content?.toString()
  })()

  return new Response(body, { status: 200, headers, ...init })
}
