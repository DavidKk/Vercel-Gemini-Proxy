export interface TextPart {
  text: string
  inlineData?: never
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

/**
 * A part of a chat message.
 * Can be either text or inline data (e.g. an image).
 */
export type Part = TextPart | InlineDataPart

/**
 * A chat message with additional information, such as the parts of the message.
 */
export interface Content {
  /** The role of the sender. Can be either "human" or "model". */
  role: string
  /** The parts of the message. */
  parts: Part[]
}

export interface Message {
  contents: Content[]
  generationConfig: {
    temperature: number
    maxOutputTokens: number
    topP: number
  }
  safetySettings: {
    category: string
    threshold: string
  }[]
}
