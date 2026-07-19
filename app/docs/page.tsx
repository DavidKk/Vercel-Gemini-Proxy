import { redirect } from 'next/navigation'

import { DOCS_DEFAULT_HREF } from '@/components/docs/sections'

export default function DocsIndexPage() {
  redirect(DOCS_DEFAULT_HREF)
}
