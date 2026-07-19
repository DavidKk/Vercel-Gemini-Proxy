import { createGeminiRouteHandlers } from '@/services/gemini'

export const runtime = 'nodejs'
export const maxDuration = 120

export const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = createGeminiRouteHandlers('v1beta')
