import { createHash } from 'node:crypto'

import { Redis } from '@upstash/redis'

import { createLogger } from '@/services/logger'

const logger = createLogger('key-rotation')

/** TTL so old UTC-day counters disappear (~2 days). */
export const ROTATION_COUNTER_TTL_SECONDS = 48 * 60 * 60

const REDIS_KEY_PREFIX = 'gemini:rot'

let redisUnavailableWarned = false
let redisClient: Redis | null | undefined

export type RedisLike = {
  mget: (...keys: string[]) => Promise<unknown[]>
  incrby: (key: string, increment: number) => Promise<number>
  expire: (key: string, seconds: number) => Promise<number | boolean>
}

/** Opaque id so Redis never stores the raw API key. */
export function fingerprintApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex').slice(0, 16)
}

/** UTC calendar day `yyyy-mm-dd`. */
export function utcDayString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

export function rotationRedisKey(day: string, fingerprint: string): string {
  return `${REDIS_KEY_PREFIX}:${day}:${fingerprint}`
}

/**
 * Parse `GEMINI_API_KEYS` JSON array (required for proxy mode).
 * Dedupes while preserving first-seen order. Empty / invalid → [].
 */
export function parseGeminiApiKeys(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): string[] {
  const multi = (env.GEMINI_API_KEYS ?? '').trim()
  if (!multi) {
    return []
  }

  try {
    const parsed = JSON.parse(multi) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }
    const keys: string[] = []
    const seen = new Set<string>()
    for (const item of parsed) {
      if (typeof item !== 'string') {
        continue
      }
      const key = item.trim()
      if (!key || seen.has(key)) {
        continue
      }
      seen.add(key)
      keys.push(key)
    }
    return keys
  } catch {
    return []
  }
}

function warnRedisUnavailableOnce(reason: string) {
  if (redisUnavailableWarned) {
    return
  }
  redisUnavailableWarned = true
  logger.warn(`Key rotation disabled (${reason}); using first configured Gemini key.`)
}

/** Reset module singletons — for tests only. */
export function resetKeyRotationStateForTests() {
  redisUnavailableWarned = false
  redisClient = undefined
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    const trimmed = (value ?? '').trim()
    if (trimmed) {
      return trimmed
    }
  }
  return ''
}

/**
 * Resolve Vercel KV / Upstash REST credentials.
 * Prefer store-prefixed vars from this project (`GEMINI_RELAY_KV_REST_API_*`).
 */
export function resolveKvRestCredentials(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): { url: string; token: string } | null {
  const url = firstNonEmpty(env.GEMINI_RELAY_KV_REST_API_URL, env.KV_REST_API_URL, env.UPSTASH_REDIS_REST_URL)
  const token = firstNonEmpty(env.GEMINI_RELAY_KV_REST_API_TOKEN, env.KV_REST_API_TOKEN, env.UPSTASH_REDIS_REST_TOKEN)
  if (!url || !token) {
    return null
  }
  return { url, token }
}

function loadRedisFromEnv(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): Redis | null {
  const credentials = resolveKvRestCredentials(env)
  if (!credentials) {
    return null
  }
  return new Redis({ url: credentials.url, token: credentials.token })
}

function getRedis(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): Redis | null {
  if (redisClient !== undefined) {
    return redisClient
  }
  redisClient = loadRedisFromEnv(env)
  return redisClient
}

function coerceCounter(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.floor(value)
  }
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n) && n >= 0) {
      return Math.floor(n)
    }
  }
  return 0
}

/**
 * Pick the Gemini key with the lowest accumulated tokens for the current UTC day.
 * Ties → lower index in `keys`. Redis missing/error → `keys[0]`.
 */
export async function pickKeyLeastTokensToday(keys: string[], options?: { redis?: RedisLike | null; env?: NodeJS.ProcessEnv; now?: Date }): Promise<string> {
  if (keys.length === 0) {
    return ''
  }
  if (keys.length === 1) {
    return keys[0]
  }

  const env = options?.env ?? process.env
  const redis = options?.redis !== undefined ? options.redis : getRedis(env)
  if (!redis) {
    warnRedisUnavailableOnce('GEMINI_RELAY_KV_REST_API_URL / GEMINI_RELAY_KV_REST_API_TOKEN unset')
    return keys[0]
  }

  const day = utcDayString(options?.now)
  const fingerprints = keys.map(fingerprintApiKey)
  const redisKeys = fingerprints.map((fp) => rotationRedisKey(day, fp))

  try {
    const values = await redis.mget(...redisKeys)
    let bestIndex = 0
    let bestCount = coerceCounter(values[0])
    for (let i = 1; i < keys.length; i += 1) {
      const count = coerceCounter(values[i])
      if (count < bestCount) {
        bestCount = count
        bestIndex = i
      }
    }
    return keys[bestIndex]
  } catch {
    warnRedisUnavailableOnce('Upstash read failed')
    return keys[0]
  }
}

/**
 * INCRBY today's counter for the key fingerprint. No-op when redis missing or delta ≤ 0.
 * Never logs token amounts or fingerprints at info level.
 */
export async function recordTokenUsage(apiKey: string, totalTokens: number, options?: { redis?: RedisLike | null; env?: NodeJS.ProcessEnv; now?: Date }): Promise<void> {
  if (!apiKey || !Number.isFinite(totalTokens) || totalTokens <= 0) {
    return
  }

  const env = options?.env ?? process.env
  const redis = options?.redis !== undefined ? options.redis : getRedis(env)
  if (!redis) {
    return
  }

  const day = utcDayString(options?.now)
  const key = rotationRedisKey(day, fingerprintApiKey(apiKey))
  const delta = Math.floor(totalTokens)

  try {
    await redis.incrby(key, delta)
    await redis.expire(key, ROTATION_COUNTER_TTL_SECONDS)
  } catch {
    // Rotation counters are best-effort; never fail the proxy response.
  }
}

/**
 * Extract `usageMetadata.totalTokenCount` from a generateContent JSON body or SSE stream text.
 * Uses the last occurrence when multiple events are present.
 */
export function extractTotalTokenCountFromBody(body: string): number | null {
  if (!body || !body.includes('usageMetadata')) {
    return null
  }

  let last: number | null = null
  const re = /"usageMetadata"\s*:\s*\{([^}]*)\}/g
  let match: RegExpExecArray | null
  while ((match = re.exec(body)) !== null) {
    const block = match[1]
    const totalMatch = /"totalTokenCount"\s*:\s*(\d+)/.exec(block)
    if (totalMatch) {
      last = Number(totalMatch[1])
      continue
    }
    const prompt = /"promptTokenCount"\s*:\s*(\d+)/.exec(block)
    const candidates = /"candidatesTokenCount"\s*:\s*(\d+)/.exec(block)
    const thoughts = /"thoughtsTokenCount"\s*:\s*(\d+)/.exec(block)
    if (prompt || candidates || thoughts) {
      last = Number(prompt?.[1] ?? 0) + Number(candidates?.[1] ?? 0) + Number(thoughts?.[1] ?? 0)
    }
  }
  return last !== null && last > 0 ? last : null
}
