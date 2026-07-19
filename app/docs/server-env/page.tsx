import type { Metadata } from 'next'

import { ServerEnvContent } from '@/components/docs/sections'

export const metadata: Metadata = {
  title: 'Server env · Gemini Relay',
  description: 'Call Gemini Relay using PROXY_AUTH_HEADERS and GEMINI_API_KEY on the server.',
}

export default function DocsServerEnvPage() {
  return <ServerEnvContent />
}
