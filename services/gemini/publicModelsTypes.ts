/** Shared (client-safe) types/constants for the API dialog model picker. */

export const DEFAULT_API_DIALOG_MODEL = 'gemini-2.5-flash'

export type PublicModelInfo = {
  id: string
  displayName: string
}

export type PublicModelsCatalog = {
  /** True when server has GEMINI_API_KEY (value never exposed). */
  geminiKeyConfigured: boolean
  models: PublicModelInfo[]
  /** How the list was produced */
  source: 'upstream' | 'fallback'
  /** Cache hint in seconds */
  revalidateSeconds: number
}
