import { ContentType } from './constants'
import type { Content } from './types'

export function getContentType(content: Content) {
  if (typeof content === 'object') {
    return ContentType.Json
  }

  return ContentType.Text
}
