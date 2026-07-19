import type { ReactNode } from 'react'

import { DocsLayoutClient } from '@/components/DocsLayoutClient'

export default function DocsLayout(props: { children: ReactNode }) {
  return <DocsLayoutClient>{props.children}</DocsLayoutClient>
}
