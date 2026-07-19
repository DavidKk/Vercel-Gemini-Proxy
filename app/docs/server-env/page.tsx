import type { Metadata } from 'next'

import { ServerEnvContent } from '@/components/docs/sections'
import { getRequestOrigin } from '@/lib/request-origin'

export const metadata: Metadata = {
  title: 'Server env · Gemini Relay',
  description: 'Call Gemini Relay using PROXY_AUTH_HEADERS and GEMINI_API_KEYS on the server.',
}

export default async function DocsServerEnvPage() {
  const host = await getRequestOrigin()
  return <ServerEnvContent host={host} />
}
