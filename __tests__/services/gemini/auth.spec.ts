import { type AuthEnv, parseProxyAuthHeaders, resolveUpstreamAuth } from '@/services/gemini/auth'

function headers(init?: Record<string, string>) {
  return new Headers(init)
}

function params(init?: Record<string, string>) {
  return new URLSearchParams(init)
}

describe('parseProxyAuthHeaders', () => {
  it('parses JSON object with one or many headers', () => {
    expect(parseProxyAuthHeaders('')).toEqual([])
    expect(parseProxyAuthHeaders('{"x-a1":"secret"}')).toEqual([{ name: 'x-a1', value: 'secret' }])
    expect(parseProxyAuthHeaders('{"x-a1":"secret","x-b2":"other"}')).toEqual([
      { name: 'x-a1', value: 'secret' },
      { name: 'x-b2', value: 'other' },
    ])
  })

  it('ignores invalid JSON and non-object payloads', () => {
    expect(parseProxyAuthHeaders('x-a1=secret')).toEqual([])
    expect(parseProxyAuthHeaders('["x-a1","secret"]')).toEqual([])
    expect(parseProxyAuthHeaders('{"x-a1":123}')).toEqual([])
  })
})

describe('resolveUpstreamAuth', () => {
  const envConfigured: AuthEnv = {
    proxyAuthHeaders: [{ name: 'x-a1b2c3d4', value: 'proxy-secret' }],
    geminiApiKey: 'server-gemini-key',
  }

  it('uses server gemini key when all custom headers match', () => {
    const result = resolveUpstreamAuth(headers({ 'x-a1b2c3d4': 'proxy-secret' }), params({ key: 'client-key' }), envConfigured)
    expect(result).toEqual({
      ok: true,
      mode: 'proxy',
      geminiApiKey: 'server-gemini-key',
    })
  })

  it('requires every configured header when multiple are set', () => {
    const envMulti: AuthEnv = {
      proxyAuthHeaders: [
        { name: 'x-one', value: 'aaa' },
        { name: 'x-two', value: 'bbb' },
      ],
      geminiApiKey: 'server-gemini-key',
    }
    expect(resolveUpstreamAuth(headers({ 'x-one': 'aaa' }), params(), envMulti)).toEqual({
      ok: false,
      status: 401,
      message: 'No permission',
    })
    expect(resolveUpstreamAuth(headers({ 'x-one': 'aaa', 'x-two': 'bbb' }), params(), envMulti)).toEqual({
      ok: true,
      mode: 'proxy',
      geminiApiKey: 'server-gemini-key',
    })
  })

  it('returns 401 when a custom header is present but value mismatches', () => {
    const result = resolveUpstreamAuth(headers({ 'x-a1b2c3d4': 'wrong' }), params(), envConfigured)
    expect(result).toEqual({ ok: false, status: 401, message: 'No permission' })
  })

  it('returns 503 when proxy auth ok but GEMINI_API_KEY missing', () => {
    const result = resolveUpstreamAuth(headers({ 'x-a1b2c3d4': 'proxy-secret' }), params(), {
      proxyAuthHeaders: [{ name: 'x-a1b2c3d4', value: 'proxy-secret' }],
      geminiApiKey: '',
    })
    expect(result).toEqual({ ok: false, status: 503, message: 'Server Gemini API key is not configured' })
  })

  it('passthrough with query key when no custom proxy headers', () => {
    const result = resolveUpstreamAuth(headers(), params({ key: 'client-key' }), envConfigured)
    expect(result).toEqual({
      ok: true,
      mode: 'passthrough',
      geminiApiKey: 'client-key',
      credentialSource: 'query',
    })
  })

  it('passthrough with x-goog-api-key when no custom proxy headers', () => {
    const result = resolveUpstreamAuth(headers({ 'x-goog-api-key': 'header-key' }), params(), envConfigured)
    expect(result).toEqual({
      ok: true,
      mode: 'passthrough',
      geminiApiKey: 'header-key',
      credentialSource: 'header',
    })
  })

  it('returns 401 when neither proxy nor client credentials', () => {
    const result = resolveUpstreamAuth(headers(), params(), envConfigured)
    expect(result).toEqual({ ok: false, status: 401, message: 'No permission' })
  })

  it('prefers custom proxy headers over client gemini credentials', () => {
    const result = resolveUpstreamAuth(headers({ 'x-a1b2c3d4': 'proxy-secret', 'x-goog-api-key': 'client-header' }), params({ key: 'client-query' }), envConfigured)
    expect(result).toMatchObject({ ok: true, mode: 'proxy', geminiApiKey: 'server-gemini-key' })
  })

  it('treats header names as case-insensitive (X-API-KEY vs x-api-key)', () => {
    const env: AuthEnv = {
      proxyAuthHeaders: [{ name: 'X-API-KEY', value: 'proxy-secret' }],
      geminiApiKey: 'server-gemini-key',
    }
    expect(resolveUpstreamAuth(headers({ 'x-api-key': 'proxy-secret' }), params(), env)).toEqual({
      ok: true,
      mode: 'proxy',
      geminiApiKey: 'server-gemini-key',
    })
  })
})
