import type { Metadata } from 'next'

import { RequestResponseContent } from '@/components/docs/sections'

export const metadata: Metadata = {
  title: 'Request & response · Gemini Relay',
  description: 'Gemini Relay request paths, bodies, responses, and common error codes.',
}

export default function DocsRequestResponsePage() {
  return <RequestResponseContent />
}
