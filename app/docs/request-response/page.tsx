import type { Metadata } from 'next'

import { RequestResponseContent } from '@/components/docs/sections'
import { getRequestOrigin } from '@/lib/request-origin'

export const metadata: Metadata = {
  title: 'Request & response · Gemini Relay',
  description: 'Gemini Relay request paths, bodies, responses, and common error codes.',
}

export default async function DocsRequestResponsePage() {
  const host = await getRequestOrigin()
  return <RequestResponseContent host={host} />
}
