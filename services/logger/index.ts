/**
 * Minimal logger for server-side code (aligned with vercel-openapi style).
 * Prefix: [level][module]
 */

function buildPrefix(level: 'info' | 'ok' | 'warn' | 'fail', module?: string): string {
  const parts: string[] = [`[${level}]`]
  if (module) {
    parts.push(`[${module}]`)
  }
  return parts.join('')
}

export interface ModuleLogger {
  info: (...args: unknown[]) => void
  ok: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  fail: (...args: unknown[]) => void
}

/**
 * Create a module-scoped logger.
 * @param moduleName e.g. "api-gemini"
 */
export function createLogger(moduleName: string): ModuleLogger {
  return {
    info: (...args: unknown[]) => {
      // eslint-disable-next-line no-console
      console.log(buildPrefix('info', moduleName), ...args)
    },
    ok: (...args: unknown[]) => {
      // eslint-disable-next-line no-console
      console.log(buildPrefix('ok', moduleName), ...args)
    },
    warn: (...args: unknown[]) => {
      // eslint-disable-next-line no-console
      console.warn(buildPrefix('warn', moduleName), ...args)
    },
    fail: (...args: unknown[]) => {
      // eslint-disable-next-line no-console
      console.error(buildPrefix('fail', moduleName), ...args)
    },
  }
}
