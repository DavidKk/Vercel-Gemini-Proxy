import { createLogger, type ModuleLogger } from '@/services/logger'

export type GeminiLogger = {
  request: ModuleLogger
  response: ModuleLogger
}

export function createContext(request: Request & { nextUrl?: URL }) {
  const logger: GeminiLogger = {
    request: createLogger('api-gemini-request'),
    response: createLogger('api-gemini-response'),
  }
  return { logger, request }
}

export type Context = ReturnType<typeof createContext>
