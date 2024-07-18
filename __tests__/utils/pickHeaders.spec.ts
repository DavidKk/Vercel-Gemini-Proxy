import { pickHeaders } from '@/utils/pickHeaders'

describe('test utils/pickHeaders', () => {
  it('should return an empty Headers object when the input Headers object is empty', () => {
    const headers = new Headers()
    const keys = ['content-type', 'content-length']
    const picked = pickHeaders(headers, keys)
    expect(picked).toEqual({})
  })

  it('should return a Headers object with the specified headers', () => {
    const headers = new Headers()
    headers.set('content-type', 'application/json')
    headers.set('content-length', '100')
    headers.set('x-custom-header', 'value')
    const keys = ['content-type', 'content-length']
    const picked = pickHeaders(headers, keys)
    expect(picked).toEqual({
      'content-type': 'application/json',
      'content-length': '100',
    })
  })

  it('should return a Headers object with the specified headers using a RegExp key', () => {
    const headers = new Headers()
    headers.set('content-type', 'application/json')
    headers.set('content-length', '100')
    headers.set('x-custom-header', 'value')
    const keys = [/^content-/]
    const picked = pickHeaders(headers, keys)
    expect(picked).toEqual({
      'content-type': 'application/json',
      'content-length': '100',
    })
  })

  it('should return a Headers object with the specified headers, including non-string values', () => {
    const headers = new Headers()
    headers.set('content-type', 'application/json')
    headers.set('content-length', 100 as any) // Will be converted to a string
    headers.set('x-custom-header', 'value')
    const keys = ['content-type', 'content-length']
    const picked = pickHeaders(headers, keys)
    expect(picked).toEqual({
      'content-type': 'application/json',
      'content-length': '100',
    })
  })
})
