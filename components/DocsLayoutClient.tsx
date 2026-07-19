'use client'

import type { ReactNode } from 'react'

import { DocsHeader } from '@/components/DocsHeader'
import { DocsShell } from '@/components/DocsShell'
import { PageScrollFrame } from '@/components/PageScrollFrame'

/** Docs chrome: full-width header + custom scroll body. */
export function DocsLayoutClient(props: { children: ReactNode }) {
  return (
    <PageScrollFrame header={<DocsHeader />}>
      <DocsShell>{props.children}</DocsShell>
    </PageScrollFrame>
  )
}
