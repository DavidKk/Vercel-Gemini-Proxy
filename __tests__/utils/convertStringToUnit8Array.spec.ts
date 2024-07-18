import { convertStringToUint8Array } from '@/utils/convertStringToUint8Array'

describe('convertStringToUint8Array', () => {
  it('should return the input string if it is not a string', () => {
    const input = 123
    const result = convertStringToUint8Array(input as any)
    expect(result).toBe(input)
  })

  it('should return an Uint8Array for a valid string input', () => {
    const input = 'hello'
    const result = convertStringToUint8Array(input)
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result).toEqual(new TextEncoder().encode(input))
  })

  it('should handle empty string input', () => {
    const input = ''
    const result = convertStringToUint8Array(input)
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result).toEqual(new TextEncoder().encode(input))
  })

  it('should handle string input with special characters', () => {
    const input = 'Hello, 世界!'
    const result = convertStringToUint8Array(input)
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result).toEqual(new TextEncoder().encode(input))
  })
})
