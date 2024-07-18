import type { Result } from './types'

export interface GetResultInit {
  success?: boolean
  message?: string
}

export function getResult<T extends Record<string, any> | null>(data: T, init?: GetResultInit): Result<T> {
  const { success = true, message = 'ok' } = init || {}
  const result = { success, message, data }
  const toJson = () => JSON.stringify(result)
  return { ...result, toJson }
}
