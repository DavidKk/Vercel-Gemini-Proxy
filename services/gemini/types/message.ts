export interface TextPart {
  text: string
  inlineData?: never
  functionCall?: never
  functionResponse?: never
}

export interface GenerativeContentBlob {
  /** Mime type of the image, e.g. "image/png" */
  mimeType: string
  /** Image as a base64 string */
  data: string
}

export interface InlineDataPart {
  text?: never
  /** Inline data, such as an image */
  inlineData: GenerativeContentBlob
}

export interface FunctionCallPart {
  functionCall: {
    name: string
    args?: Record<string, unknown>
  }
}

export interface FunctionResponsePart {
  functionResponse: {
    name: string
    response: Record<string, unknown>
  }
}

/**
 * A part of a chat message.
 * Text, media, or tool/function payloads used by modern Gemini APIs.
 */
export type Part = TextPart | InlineDataPart | FunctionCallPart | FunctionResponsePart | Record<string, unknown>

/**
 * A chat message with additional information, such as the parts of the message.
 * Role is commonly "user" | "model" | "function".
 */
export interface Content {
  role?: string
  parts?: Part[]
}

/**
 * generateContent-style body. Newer endpoints (e.g. Interactions) may omit `contents`.
 */
export interface Message {
  contents?: Content[]
  systemInstruction?: Content | { parts: Part[] }
  generationConfig?: {
    temperature?: number
    maxOutputTokens?: number
    topP?: number
    [key: string]: unknown
  }
  safetySettings?: {
    category: string
    threshold: string
  }[]
  [key: string]: unknown
}

/** Roles Gemini accepts as a valid multiturn terminator for generateContent. */
export function isValidTrailingContentRole(role?: string) {
  return role === 'user' || role === 'function'
}
