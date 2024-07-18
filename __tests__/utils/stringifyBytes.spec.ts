import { stringifyBytes } from '@/utils/stringifyBytes'

describe('stringifyBytes', () => {
  it('should return "0 Bytes" for 0 bytes', () => {
    expect(stringifyBytes(0)).toBe('0 Bytes')
  })

  it('should return correct value for bytes', () => {
    expect(stringifyBytes(123)).toBe('123 Bytes')
  })

  it('should return correct value for kilobytes', () => {
    expect(stringifyBytes(1500)).toBe('1.46 KB')
  })

  it('should return correct value for megabytes', () => {
    expect(stringifyBytes(1500000)).toBe('1.43 MB')
  })

  it('should return correct value for gigabytes', () => {
    expect(stringifyBytes(1500000000)).toBe('1.4 GB')
  })

  it('should return correct value for terabytes', () => {
    expect(stringifyBytes(1500000000000)).toBe('1.36 TB')
  })

  it('should return correct value for petabytes', () => {
    expect(stringifyBytes(1500000000000000)).toBe('1.33 PB')
  })

  it('should return correct value for exabytes', () => {
    expect(stringifyBytes(1500000000000000000)).toBe('1.3 EB')
  })

  it('should return correct value for zettabytes', () => {
    expect(stringifyBytes(1500000000000000000000)).toBe('1.27 ZB')
  })

  it('should return correct value for yottabytes', () => {
    expect(stringifyBytes(1500000000000000000000000)).toBe('1.24 YB')
  })

  it('should handle negative decimals', () => {
    expect(stringifyBytes(1500, -1)).toBe('1 KB')
  })

  it('should handle zero decimals', () => {
    expect(stringifyBytes(1500, 0)).toBe('1 KB')
  })

  it('should handle custom decimals', () => {
    expect(stringifyBytes(1500, 3)).toBe('1.465 KB')
  })
})
