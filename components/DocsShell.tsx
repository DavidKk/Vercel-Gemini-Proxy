'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { DOCS_NAV } from '@/components/docs/sections'

/** Shared docs chrome: left nav links to sub-pages. */
export function DocsShell(props: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8 lg:px-8 lg:py-10">
      <aside className="shrink-0 border border-border bg-surface p-3 lg:self-start">
        <p className="px-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Guide</p>
        <nav className="mt-2 flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0" aria-label="Docs sections">
          {DOCS_NAV.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 rounded-md px-3 py-2.5 text-left transition-colors lg:w-full ${
                  active ? 'bg-brand-soft text-primary ring-1 ring-brand/20' : 'text-muted hover:bg-canvas hover:text-primary'
                }`}
              >
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="mt-0.5 hidden text-[11px] text-muted lg:block">{item.hint}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="min-w-0 w-full">{props.children}</div>
    </div>
  )
}
