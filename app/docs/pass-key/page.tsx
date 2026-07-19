import type { Metadata } from 'next'

import { PassKeyContent } from '@/components/docs/sections'
import { getRequestOrigin } from '@/lib/request-origin'

export const metadata: Metadata = {
  title: 'Pass API key · Gemini Relay',
  description: 'Call Gemini Relay by passing your Gemini API key on each request.',
}

export default async function DocsPassKeyPage() {
  const host = await getRequestOrigin()
  return <PassKeyContent host={host} />
}
