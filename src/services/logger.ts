import type { ValuesTypeOfArray } from '../types/utils'

export const LOG_TYPES = ['info', 'fail', 'ok', 'warn'] as const
export type LoggerType = ValuesTypeOfArray<typeof LOG_TYPES>
export type Logger = (message: string) => void
export type LoggerMap<T extends readonly unknown[]> = {
  [P in ValuesTypeOfArray<T>]: Record<LoggerType, Logger>
}

export const prettyPrefix = (prefix: string) => {
  return `[${prefix.toUpperCase()}]`
}

export const createLogMethod = <T extends readonly string[]>(...prefixes: T) => {
  return (content: string) => {
    const banner = prefixes.filter(Boolean).map(prettyPrefix).join('')
    // eslint-disable-next-line no-console
    console.log(`${banner} ${content}`)
  }
}

export const createLogger = <T extends readonly string[]>(...types: T) => {
  const register = (...prefixes: string[]) => {
    return Object.fromEntries(
      (function* () {
        for (const name of types) {
          yield [
            name,
            Object.fromEntries(
              (function* () {
                for (const type of LOG_TYPES) {
                  yield [type, createLogMethod(type, ...prefixes, name)]
                }
              })()
            ),
          ]
        }
      })()
    ) as LoggerMap<T>
  }

  return { ...register(), register }
}
