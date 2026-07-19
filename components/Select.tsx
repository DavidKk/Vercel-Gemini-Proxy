'use client'

import { useEffect, useId, useRef, useState } from 'react'

import { ScrollArea } from '@/components/ScrollArea'

export type SelectOption = {
  value: string
  label: string
}

type SelectProps = {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
  loading?: boolean
  placeholder?: string
  /** Panel opens below (default) or above the trigger */
  placement?: 'bottom' | 'top'
  className?: string
  /** Accessible name for the trigger */
  'aria-label'?: string
}

/**
 * Custom listbox select (no native `<select>`). Matches playground model picker chrome.
 */
export function Select(props: SelectProps) {
  const { value, options, onChange, disabled = false, loading = false, placeholder = 'Select…', placement = 'bottom', className = '', 'aria-label': ariaLabel } = props

  const listId = useId()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)

  const selected = options.find((opt) => opt.value === value)
  const triggerLabel = loading ? 'Loading…' : selected?.label || placeholder

  useEffect(() => {
    if (!open) {
      return
    }
    const onPointer = (event: MouseEvent) => {
      const root = rootRef.current
      if (!root || !(event.target instanceof Node) || root.contains(event.target)) {
        return
      }
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const panelClass = placement === 'top' ? 'absolute bottom-full left-0 right-0 z-20 mb-2' : 'absolute top-full left-0 right-0 z-20 mt-2'

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`.trim()}>
      <button
        type="button"
        disabled={disabled || loading}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface px-2.5 text-left font-mono text-[12px] text-primary outline-none transition-colors hover:border-brand/40 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="min-w-0 flex-1 truncate">{triggerLabel}</span>
        <ChevronIcon open={open} />
      </button>

      {open && options.length > 0 ? (
        <div id={listId} role="listbox" className={`${panelClass} overflow-hidden border border-border bg-surface py-1 shadow-composer`}>
          <ScrollArea className="max-h-56 min-h-0" scrollClassName="py-0">
            {options.map((opt) => {
              const active = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`block w-full truncate px-3 py-2 text-left font-mono text-[12px] hover:bg-canvas ${active ? 'font-semibold text-brand' : 'text-primary'}`}
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </ScrollArea>
        </div>
      ) : null}
    </div>
  )
}

function ChevronIcon(props: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`shrink-0 text-muted transition-transform ${props.open ? 'rotate-180' : ''}`}>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
