import { headers } from 'next/headers'

/**
 * Resolve this deployment’s origin from the incoming request (SSR-safe).
 * Prefer `x-forwarded-*` (Vercel / reverse proxies), then `host`.
 */
export async function getRequestOrigin(): Promise<string> {
  const h = await headers()
  const host = (h.get('x-forwarded-host') ?? h.get('host') ?? '').split(',')[0]?.trim()
  if (!host) {
    return ''
  }
  const proto = (h.get('x-forwarded-proto') ?? (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https')).split(',')[0]?.trim() || 'https'
  return `${proto}://${host}`
}
