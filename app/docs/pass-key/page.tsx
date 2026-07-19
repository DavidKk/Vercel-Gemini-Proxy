import type { Metadata } from 'next'

import { PassKeyContent } from '@/components/docs/sections'

export const metadata: Metadata = {
  title: 'Pass API key · Gemini Relay',
  description: 'Call Gemini Relay by passing your Gemini API key on each request.',
}

export default function DocsPassKeyPage() {
  return <PassKeyContent />
}
