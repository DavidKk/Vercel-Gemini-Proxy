import { byteToKM } from '@/utils/byteToKM'

describe('byteToKM', () => {
  const KB = 1024
  const MB = KB * KB
  const GB = MB * KB
  const TB = GB * KB
  const PB = TB * KB
  const EB = PB * KB

  it('should convert bytes to KB', () => {
    expect(byteToKM(KB)).toEqual('1K')
    expect(byteToKM(1.2 * KB)).toEqual('1.2K')
  })

  it('should convert bytes to MB', () => {
    expect(byteToKM(MB)).toEqual('1M')
    expect(byteToKM(1.2 * MB)).toEqual('1.2M')
  })

  it('should convert bytes to GB', () => {
    expect(byteToKM(GB)).toEqual('1G')
    expect(byteToKM(1.2 * GB)).toEqual('1.2G')
  })

  it('should convert bytes to TB', () => {
    expect(byteToKM(TB)).toEqual('1T')
    expect(byteToKM(1.2 * TB)).toEqual('1.2T')
  })

  it('should convert bytes to PB', () => {
    expect(byteToKM(PB)).toEqual('1P')
    expect(byteToKM(1.2 * PB)).toEqual('1.2P')
  })

  it('should convert bytes to EB', () => {
    expect(byteToKM(EB)).toEqual('1E')
    expect(byteToKM(1.2 * EB)).toEqual('1.2E')
  })
})
