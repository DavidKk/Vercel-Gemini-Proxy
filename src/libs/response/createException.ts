import { getResult } from './getResult'

export function createException(message: string) {
  const exception = getResult(null, { success: false, message })
  return exception
}
