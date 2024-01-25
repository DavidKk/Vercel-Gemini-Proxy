import { getContentLength } from '@/utils/getContentLength'

describe('test utils/getContentLength', () => {
  it('should return 0 when content-length is not set', () => {
    const headers = new Headers()
    const contentLength = getContentLength(headers)
    expect(contentLength).toBe(0)
  })

  it('should return the content-length when it is set', () => {
    const headers = new Headers()
    headers.set('content-length', '100')
    const contentLength = getContentLength(headers)
    expect(contentLength).toBe(100)
  })

  it('should return 0 when content-length is not a number', () => {
    const headers = new Headers()
    headers.set('content-length', 'abc')
    const contentLength = getContentLength(headers)
    expect(contentLength).toBe(0)
  })
})
