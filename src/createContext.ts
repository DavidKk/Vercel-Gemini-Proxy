import { createLogger } from './services/logger'

export function createContext(request: Request & { nextUrl?: URL }) {
  const logger = createLogger('request', 'response')
  return { logger, request }
}

export type Context = ReturnType<typeof createContext>
