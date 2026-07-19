'use client'

import { useCallback, useEffect, useState } from 'react'

import { clearModelsCache, loadSettings, resolveApiRoot, saveSettings } from '@/lib/playground/storage'
import { DEFAULT_PLAYGROUND_SETTINGS, type PlaygroundSettings } from '@/lib/playground/types'

import { PlaygroundHeader } from './PlaygroundHeader'
import { PlaygroundSettingsPanel } from './PlaygroundSettings'
import { SettingsFormSkeleton } from './PlaygroundSkeletons'

export function PlaygroundSettingsPage() {
  const [settings, setSettings] = useState<PlaygroundSettings>(DEFAULT_PLAYGROUND_SETTINGS)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setSettings(loadSettings())
    setHydrated(true)
  }, [])

  const handleSave = useCallback(
    (next: PlaygroundSettings) => {
      const prevRoot = resolveApiRoot(settings)
      const nextRoot = resolveApiRoot(next)
      saveSettings(next)
      setSettings(next)

      if (prevRoot !== nextRoot || settings.apiKey.trim() !== next.apiKey.trim()) {
        clearModelsCache()
      }
    },
    [settings]
  )

  if (!hydrated) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-canvas">
        <PlaygroundHeader variant="settings" />
        <SettingsFormSkeleton />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      <PlaygroundHeader variant="settings" />
      <PlaygroundSettingsPanel settings={settings} onSave={handleSave} />
    </div>
  )
}
