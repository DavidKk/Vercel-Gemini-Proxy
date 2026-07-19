import {
  extractTotalTokenCountFromBody,
  fingerprintApiKey,
  parseGeminiApiKeys,
  pickKeyLeastTokensToday,
  recordTokenUsage,
  type RedisLike,
  resetKeyRotationStateForTests,
  resolveKvRestCredentials,
  rotationRedisKey,
  utcDayString,
} from '@/services/gemini/keyRotation'

function createMemoryRedis(initial: Record<string, number> = {}): RedisLike & { store: Record<string, number>; ttls: Record<string, number> } {
  const store = { ...initial }
  const ttls: Record<string, number> = {}
  return {
    store,
    ttls,
    async mget(...keys: string[]) {
      return keys.map((key) => (key in store ? store[key] : null))
    },
    async incrby(key: string, increment: number) {
      store[key] = (store[key] ?? 0) + increment
      return store[key]
    },
    async expire(key: string, seconds: number) {
      ttls[key] = seconds
      return 1
    },
  }
}

describe('keyRotation helpers', () => {
  beforeEach(() => {
    resetKeyRotationStateForTests()
  })

  it('fingerprints keys opaquely and builds UTC redis keys', () => {
    const fp = fingerprintApiKey('secret-a')
    expect(fp).toHaveLength(16)
    expect(fp).toMatch(/^[0-9a-f]+$/)
    expect(fingerprintApiKey('secret-a')).toBe(fp)
    expect(fingerprintApiKey('secret-b')).not.toBe(fp)
    expect(utcDayString(new Date('2026-07-19T23:00:00.000Z'))).toBe('2026-07-19')
    expect(rotationRedisKey('2026-07-19', fp)).toBe(`gemini:rot:2026-07-19:${fp}`)
  })

  it('parses GEMINI_API_KEYS JSON array only', () => {
    expect(parseGeminiApiKeys({ GEMINI_API_KEYS: '[" a ","b","a"]' })).toEqual(['a', 'b'])
    expect(parseGeminiApiKeys({ GEMINI_API_KEYS: '["only"]' })).toEqual(['only'])
    expect(parseGeminiApiKeys({ GEMINI_API_KEYS: 'not-json', GEMINI_API_KEY: 'ignored' })).toEqual([])
    expect(parseGeminiApiKeys({ GEMINI_API_KEY: 'ignored' })).toEqual([])
    expect(parseGeminiApiKeys({})).toEqual([])
  })

  it('resolves Vercel KV REST credentials with store-prefixed vars first', () => {
    expect(
      resolveKvRestCredentials({
        GEMINI_RELAY_KV_REST_API_URL: 'https://prefixed.example',
        GEMINI_RELAY_KV_REST_API_TOKEN: 'pref-token',
        KV_REST_API_URL: 'https://generic.example',
        KV_REST_API_TOKEN: 'generic-token',
      })
    ).toEqual({ url: 'https://prefixed.example', token: 'pref-token' })
    expect(
      resolveKvRestCredentials({
        KV_REST_API_URL: 'https://generic.example',
        KV_REST_API_TOKEN: 'generic-token',
      })
    ).toEqual({ url: 'https://generic.example', token: 'generic-token' })
    expect(resolveKvRestCredentials({ GEMINI_RELAY_KV_URL: 'rediss://ignored' })).toBeNull()
  })

  it('picks the least-used key; ties keep lower index', async () => {
    const keys = ['k0', 'k1', 'k2']
    const day = '2026-07-19'
    const redis = createMemoryRedis({
      [rotationRedisKey(day, fingerprintApiKey('k0'))]: 100,
      [rotationRedisKey(day, fingerprintApiKey('k1'))]: 10,
      [rotationRedisKey(day, fingerprintApiKey('k2'))]: 10,
    })

    await expect(pickKeyLeastTokensToday(keys, { redis, now: new Date(`${day}T12:00:00.000Z`) })).resolves.toBe('k1')
  })

  it('falls back to first key when redis is null', async () => {
    await expect(pickKeyLeastTokensToday(['a', 'b'], { redis: null })).resolves.toBe('a')
  })

  it('records usage with TTL and skips non-positive deltas', async () => {
    const redis = createMemoryRedis()
    const key = 'api-key-1'
    const day = '2026-07-19'
    const redisKey = rotationRedisKey(day, fingerprintApiKey(key))

    await recordTokenUsage(key, 42, { redis, now: new Date(`${day}T01:00:00.000Z`) })
    expect(redis.store[redisKey]).toBe(42)
    expect(redis.ttls[redisKey]).toBe(48 * 60 * 60)

    await recordTokenUsage(key, 0, { redis, now: new Date(`${day}T01:00:00.000Z`) })
    expect(redis.store[redisKey]).toBe(42)
  })

  it('extracts last totalTokenCount from JSON or SSE bodies', () => {
    expect(extractTotalTokenCountFromBody('{"candidates":[]}')).toBeNull()
    expect(
      extractTotalTokenCountFromBody(
        JSON.stringify({
          usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 5, totalTokenCount: 8 },
        })
      )
    ).toBe(8)

    const sse = [
      'data: {"candidates":[{"content":{"parts":[{"text":"hi"}]}}]}',
      'data: {"usageMetadata":{"promptTokenCount":1,"candidatesTokenCount":2,"totalTokenCount":3}}',
      'data: {"usageMetadata":{"promptTokenCount":10,"candidatesTokenCount":20,"totalTokenCount":35}}',
    ].join('\n')
    expect(extractTotalTokenCountFromBody(sse)).toBe(35)

    expect(
      extractTotalTokenCountFromBody(
        JSON.stringify({
          usageMetadata: { promptTokenCount: 2, candidatesTokenCount: 3, thoughtsTokenCount: 4 },
        })
      )
    ).toBe(9)
  })
})
