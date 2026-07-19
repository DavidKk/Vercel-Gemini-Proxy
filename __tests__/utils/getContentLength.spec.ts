import { getContentLength } from '@/services/gemini/utils/getContentLength'

describe('test getContentLength', () => {
  it('should return the content length from the headers', () => {
    const headers = new Headers({ 'content-length': '100' })
    expect(getContentLength(headers)).toBe(100)
  })

  it('should return 0 if content-length is missing or invalid', () => {
    expect(getContentLength(new Headers())).toBe(0)
    expect(getContentLength(new Headers({ 'content-length': 'abc' }))).toBe(0)
  })
})
