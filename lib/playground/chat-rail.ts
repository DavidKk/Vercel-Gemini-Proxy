export type ChatRailSegment = {
  id: string
  userPreview: string
  assistantPreview: string
  streaming?: boolean
}

export type ChatRailMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

const RAIL_PREVIEW_MAX = 160

export function truncateRailPreview(text: string, max = RAIL_PREVIEW_MAX): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= max) {
    return normalized
  }
  return `${normalized.slice(0, max - 1)}…`
}

/** Codex-style: longer content → wider bar, about 30%–100%. */
export function resolveRailBarWidthPercent(userPreview: string, assistantPreview: string): number {
  const length = userPreview.length + assistantPreview.length
  if (length <= 0) {
    return 36
  }

  return Math.min(100, Math.max(30, 30 + Math.round(Math.sqrt(length) * 2.8)))
}

/** Merge messages into user → assistant turns for the conversation rail. */
export function buildChatRailSegments(messages: ChatRailMessage[]): ChatRailSegment[] {
  const segments: ChatRailSegment[] = []
  let current: ChatRailSegment | null = null

  for (const message of messages) {
    const body = message.content.trim()

    if (message.role === 'user') {
      if (current) {
        segments.push(current)
      }
      current = {
        id: message.id,
        userPreview: body,
        assistantPreview: '',
      }
      continue
    }

    if (!current) {
      segments.push({
        id: message.id,
        userPreview: '',
        assistantPreview: body,
        streaming: message.streaming,
      })
      continue
    }

    current.assistantPreview = current.assistantPreview ? `${current.assistantPreview}\n${body}` : body
    if (message.streaming === true) {
      current.streaming = true
    }
  }

  if (current) {
    segments.push(current)
  }

  return segments.map((segment) => ({
    ...segment,
    userPreview: truncateRailPreview(segment.userPreview),
    assistantPreview: truncateRailPreview(segment.assistantPreview),
  }))
}
