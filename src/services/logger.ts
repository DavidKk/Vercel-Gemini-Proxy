// Import the ValuesTypeOfArray type from the '../types/utils' module
import type { ValuesTypeOfArray } from '../types/utils'

// Define a constant array of log types
export const LOG_TYPES = ['info', 'fail', 'ok', 'warn'] as const

// Define a type alias LoggerType that represents the union of string literals from the LOG_TYPES array
export type LoggerType = ValuesTypeOfArray<typeof LOG_TYPES>

// Define a type alias Logger that represents a function that takes a string message as input
export type Logger = (message: string) => void

// Define a type alias LoggerMap that represents an object with keys from the given array T
// and values as objects with keys of type LoggerType and values of type Logger
export type LoggerMap<T extends readonly unknown[]> = {
  [P in ValuesTypeOfArray<T>]: Record<LoggerType, Logger>
}

// Function to create a pretty prefix for logging
export function prettyPrefix(prefix: string) {
  return `[${prefix.toUpperCase()}]`
}

// Function to create a log method with prefixes
export function createLogMethod<T extends readonly string[]>(...prefixes: T) {
  return (content: string) => {
    const banner = prefixes.filter(Boolean).map(prettyPrefix).join('')
    // eslint-disable-next-line no-console
    console.log(`${banner} ${content}`)
  }
}

// Function to create a logger with multiple types
export function createLogger<T extends readonly string[]>(...types: T) {
  // Define a register function that takes prefixes as input
  const register = (...prefixes: string[]) => {
    const loggers = Object.fromEntries(
      (function* () {
        for (const name of types) {
          const fns = Object.fromEntries(
            (function* () {
              for (const type of LOG_TYPES) {
                const fn = createLogMethod(type, ...prefixes, name)
                yield [type, fn] as const
              }
            })()
          )

          // Yield a key-value pair of the name and the object of log methods
          yield [name, fns as Record<LoggerType, Logger>]
        }
      })()
    )

    return loggers as LoggerMap<T>
  }

  return { ...register(), register }
}
