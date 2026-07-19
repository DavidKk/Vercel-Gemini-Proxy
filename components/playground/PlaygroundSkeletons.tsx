'use client'

import type { ComponentPropsWithoutRef, ReactNode } from 'react'

type SkeletonProps = ComponentPropsWithoutRef<'div'>

export function Skeleton({ className = '', ...rest }: SkeletonProps) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-black/[0.06] motion-reduce:animate-none ${className}`.trim()} {...rest} />
}

type SkeletonRegionProps = {
  label: string
  children: ReactNode
  className?: string
}

export function SkeletonRegion(props: SkeletonRegionProps) {
  const { label, children, className = '' } = props
  return (
    <div role="status" aria-busy="true" aria-label={label} className={className}>
      {children}
      <span className="sr-only">{label}</span>
    </div>
  )
}

type ChatMessagesSkeletonProps = {
  rows?: number
  label?: string
}

function AssistantLinesSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex w-full flex-col gap-2">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className="h-3.5" style={{ width: `${88 - index * 12}%`, maxWidth: index === lines - 1 ? '16rem' : '36rem' }} />
      ))}
    </div>
  )
}

function UserBubbleSkeleton() {
  return (
    <div className="flex justify-end">
      <Skeleton className="h-10 w-44 max-w-[min(100%,42rem)] rounded-md" />
    </div>
  )
}

/** Chat message list placeholder — used while hydrating from localStorage. */
export function ChatMessagesSkeleton({ rows = 4, label = 'Loading messages' }: ChatMessagesSkeletonProps) {
  return (
    <SkeletonRegion label={label} className="mx-auto w-full max-w-5xl px-3 py-5 md:px-4">
      <ul className="m-0 flex list-none flex-col gap-8 p-0">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index}>{index % 2 === 0 ? <UserBubbleSkeleton /> : <AssistantLinesSkeleton lines={index === 1 ? 3 : 2} />}</li>
        ))}
      </ul>
    </SkeletonRegion>
  )
}

/** Settings form placeholder. */
export function SettingsFormSkeleton({ label = 'Loading settings' }: { label?: string }) {
  return (
    <SkeletonRegion label={label} className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6">
      <div className="border border-border bg-surface p-5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-2 h-3 w-64 max-w-full" />
        <Skeleton className="mt-6 h-3 w-16" />
        <Skeleton className="mt-1.5 h-10 w-full" />
        <Skeleton className="mt-4 h-3 w-20" />
        <Skeleton className="mt-1.5 h-10 w-full" />
        <Skeleton className="mt-5 h-9 w-28" />
      </div>
    </SkeletonRegion>
  )
}
