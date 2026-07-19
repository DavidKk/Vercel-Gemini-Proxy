import { createGeminiRouteHandlers } from '@/services/gemini'

export const runtime = 'nodejs'
export const maxDuration = 120

/** Interactions API and newer Generative Language surfaces use v1beta2. */
export const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = createGeminiRouteHandlers('v1beta2')
