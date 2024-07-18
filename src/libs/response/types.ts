export type Content = Record<string, any> | string | null

export interface Result<T = Record<string, any>> {
  success: boolean
  message: string
  data: T
  toJson(): string
}
