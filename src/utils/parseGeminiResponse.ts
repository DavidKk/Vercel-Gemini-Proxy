import type { Content } from '../types/message'

export interface GeminiCandidate {
  content: Content
  finishReason: string
  index: number
  safetyRatings: {
    category: string
    probability: string
  }[]
}

export interface GeminiResponse {
  candidates?: GeminiCandidate[]
  promptFeedback?: {
    safetyRatings: {
      category: string
      probability: string
    }[]
  }
}

/**
 * Parses the Gemini REST API response and extracts the generated text.
 *
 * @param response The raw JSON response from the Gemini API.
 * @returns The generated text content.
 */
export function parseGeminiResponse(response: GeminiResponse): string {
  if (!response.candidates || response.candidates.length === 0) {
    return ''
  }

  // Usually we care about the first candidate
  const candidate = response.candidates[0]

  if (!candidate.content || !candidate.content.parts) {
    return ''
  }

  return candidate.content.parts.map((part) => part.text || '').join('')
}
