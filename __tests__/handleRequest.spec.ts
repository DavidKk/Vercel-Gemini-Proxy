import { TIMEOUT } from '@/services/gemini/constants'
import { createContext } from '@/services/gemini/createContext'
import { handleRequest, redactForLog } from '@/services/gemini/handleRequest'
import type { Message } from '@/services/gemini/types/message'

describe('test handleRequest', () => {
  const originalProxyAuth = process.env.PROXY_AUTH_HEADERS
  const originalGeminiKeys = process.env.GEMINI_API_KEYS

  afterEach(() => {
    if (originalProxyAuth === undefined) {
      delete process.env.PROXY_AUTH_HEADERS
    } else {
      process.env.PROXY_AUTH_HEADERS = originalProxyAuth
    }
    if (originalGeminiKeys === undefined) {
      delete process.env.GEMINI_API_KEYS
    } else {
      process.env.GEMINI_API_KEYS = originalGeminiKeys
    }
  })

  it('uses 120s business timeout aligned with maxDuration', () => {
    expect(TIMEOUT).toBe(120_000)
  })

  it('redacts api keys and custom proxy headers from log payloads', () => {
    expect(redactForLog({ key: 'secret', q: 'gold' })).toEqual({ key: '[redacted]', q: 'gold' })
    expect(redactForLog({ headers: { 'x-goog-api-key': 'server-key', 'x-ceba5997': 'tok', 'Content-Type': 'application/json' } }, ['x-ceba5997'])).toEqual({
      headers: { 'x-goog-api-key': '[redacted]', 'x-ceba5997': '[redacted]', 'Content-Type': 'application/json' },
    })
    expect(redactForLog('https://example.com/api?key=abc&alt=sse')).toBe('https://example.com/api?key=%5Bredacted%5D&alt=sse')
  })

  it('should return a 200 response with the correct content-type header', async () => {
    global.fetch = jest.fn().mockImplementation(async () => new Response('ok'))

    const message: Pick<Message, 'contents'> = {
      contents: [
        {
          role: 'user',
          parts: [{ text: 'hello world' }],
        },
      ],
    }

    const request = new Request('https://example.com/api/v1/projects/my-project/locations/us-central1/agents/my-agent/sessions/1234567890:detectIntent?key=123', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    const response = await handleRequest(createContext(request))
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/json')
    expect(response.headers.get('Content-Length')).toBeNull()
    expect(response.headers.get('x-goog-api-key')).toBeNull()
  })

  it('uses text/event-stream for alt=sse without echoing content-length', async () => {
    global.fetch = jest.fn().mockImplementation(async () => new Response('data: {}\n\n'))

    const request = new Request('https://example.com/api/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=123', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': '58',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
      }),
    })

    const response = await handleRequest(createContext(request))
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/event-stream; charset=utf-8')
    expect(response.headers.get('Content-Length')).toBeNull()
    expect(response.headers.get('x-goog-api-key')).toBeNull()
  })

  it('accepts x-goog-api-key without query key', async () => {
    global.fetch = jest.fn().mockImplementation(async () => new Response('ok'))

    const request = new Request('https://example.com/api/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': 'test-key',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
      }),
    })

    const response = await handleRequest(createContext(request))
    expect(response.status).toBe(200)
    expect(global.fetch).toHaveBeenCalled()
  })

  it('allows GET without body (list models)', async () => {
    global.fetch = jest.fn().mockImplementation(async () => new Response('{"models":[]}'))

    const request = new Request('https://example.com/api/v1beta/models?key=123', {
      method: 'GET',
    })

    const response = await handleRequest(createContext(request))
    expect(response.status).toBe(200)
    expect(global.fetch).toHaveBeenCalled()
  })

  it('passthrough Interactions-style body without contents', async () => {
    global.fetch = jest.fn().mockImplementation(async () => new Response('ok'))

    const request = new Request('https://example.com/api/v1beta2/interactions?key=123', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gemini-2.5-flash', input: 'hello' }),
    })

    const response = await handleRequest(createContext(request))
    expect(response.status).toBe(200)
    expect(global.fetch).toHaveBeenCalled()
  })

  it('accepts custom proxy auth headers and injects server GEMINI_API_KEYS', async () => {
    process.env.PROXY_AUTH_HEADERS = '{"x-a1b2c3d4":"proxy-secret"}'
    process.env.GEMINI_API_KEYS = '["server-gemini-key"]'
    global.fetch = jest.fn().mockImplementation(async () => new Response('ok'))

    const request = new Request('https://example.com/api/v1beta/models', {
      method: 'GET',
      headers: { 'x-a1b2c3d4': 'proxy-secret' },
    })

    const response = await handleRequest(createContext(request))
    expect(response.status).toBe(200)
    expect(global.fetch).toHaveBeenCalled()
    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [URL, RequestInit]
    const headers = new Headers(init.headers)
    expect(headers.get('x-goog-api-key')).toBe('server-gemini-key')
  })

  it('returns 401 for wrong custom proxy auth header value', async () => {
    process.env.PROXY_AUTH_HEADERS = '{"x-a1b2c3d4":"proxy-secret"}'
    process.env.GEMINI_API_KEYS = '["server-gemini-key"]'

    const request = new Request('https://example.com/api/v1beta/models', {
      method: 'GET',
      headers: { 'x-a1b2c3d4': 'wrong' },
    })

    const response = await handleRequest(createContext(request))
    expect(response.status).toBe(401)
  })

  it('returns 503 when proxy auth ok but GEMINI_API_KEYS missing', async () => {
    process.env.PROXY_AUTH_HEADERS = '{"x-a1b2c3d4":"proxy-secret"}'
    delete process.env.GEMINI_API_KEYS

    const request = new Request('https://example.com/api/v1beta/models', {
      method: 'GET',
      headers: { 'x-a1b2c3d4': 'proxy-secret' },
    })

    const response = await handleRequest(createContext(request))
    expect(response.status).toBe(503)
  })

  it('aborts upstream fetch when the client request signal aborts', async () => {
    const client = new AbortController()
    let upstreamSignal: AbortSignal | undefined

    global.fetch = jest.fn().mockImplementation((_url: unknown, init?: RequestInit) => {
      upstreamSignal = init?.signal ?? undefined
      return new Promise(() => {
        // never resolves — wait for abort
      })
    })

    const request = new Request('https://example.com/api/v1beta/models?key=123', {
      method: 'GET',
      signal: client.signal,
    })

    const response = await handleRequest(createContext(request))
    expect(response.status).toBe(200)
    expect(upstreamSignal).toBeDefined()
    expect(upstreamSignal?.aborted).toBe(false)

    client.abort()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(upstreamSignal?.aborted).toBe(true)
  })
})
