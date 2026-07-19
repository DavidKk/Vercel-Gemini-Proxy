import { unstable_cache } from 'next/cache'

import { loadAuthEnv } from '@/services/gemini/auth'
import { GOOGLE_GEMINI_API_URL } from '@/services/gemini/constants'
import { DEFAULT_API_DIALOG_MODEL, type PublicModelInfo, type PublicModelsCatalog } from '@/services/gemini/publicModelsTypes'

export type { PublicModelInfo, PublicModelsCatalog } from '@/services/gemini/publicModelsTypes'
export { DEFAULT_API_DIALOG_MODEL } from '@/services/gemini/publicModelsTypes'

/** Cache TTL for public model catalog (1 day). */
export const MODELS_CATALOG_REVALIDATE_SECONDS = 60 * 60 * 24

type GoogleModelsResponse = {
  models?: Array<{
    name?: string
    displayName?: string
    supportedGenerationMethods?: string[]
  }>
  nextPageToken?: string
  error?: { message?: string }
}

function normalizeModelId(name: string): string {
  return name.replace(/^models\//, '').trim()
}

function fallbackCatalog(geminiKeyConfigured: boolean): PublicModelsCatalog {
  return {
    geminiKeyConfigured,
    models: [{ id: DEFAULT_API_DIALOG_MODEL, displayName: DEFAULT_API_DIALOG_MODEL }],
    source: 'fallback',
    revalidateSeconds: MODELS_CATALOG_REVALIDATE_SECONDS,
  }
}

async function fetchAllGenerateContentModels(apiKey: string): Promise<PublicModelInfo[]> {
  const models: PublicModelInfo[] = []
  let pageToken = ''

  for (let page = 0; page < 10; page += 1) {
    const url = new URL('v1beta/models', `${GOOGLE_GEMINI_API_URL}/`)
    url.searchParams.set('key', apiKey)
    url.searchParams.set('pageSize', '100')
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken)
    }

    const response = await fetch(url, { method: 'GET', cache: 'no-store' })
    const data = (await response.json()) as GoogleModelsResponse
    if (!response.ok) {
      throw new Error(data.error?.message || `HTTP ${response.status}`)
    }

    for (const model of data.models ?? []) {
      const methods = model.supportedGenerationMethods ?? []
      if (!methods.includes('generateContent')) {
        continue
      }
      const id = normalizeModelId(String(model.name ?? ''))
      if (!id.startsWith('gemini')) {
        continue
      }
      models.push({
        id,
        displayName: String(model.displayName ?? id).trim() || id,
      })
    }

    pageToken = String(data.nextPageToken ?? '').trim()
    if (!pageToken) {
      break
    }
  }

  models.sort((a, b) => a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id))
  return models
}

async function loadUpstreamCatalog(apiKey: string): Promise<PublicModelsCatalog> {
  const models = await fetchAllGenerateContentModels(apiKey)
  if (models.length === 0) {
    return fallbackCatalog(true)
  }
  return {
    geminiKeyConfigured: true,
    models,
    source: 'upstream',
    revalidateSeconds: MODELS_CATALOG_REVALIDATE_SECONDS,
  }
}

/**
 * Public model catalog for the API dialog.
 * Uses server `GEMINI_API_KEY` only; never returns the key. Cached 1 day when key is set.
 */
export async function getPublicModelsCatalog(): Promise<PublicModelsCatalog> {
  const { geminiApiKey } = loadAuthEnv()
  if (!geminiApiKey) {
    return fallbackCatalog(false)
  }

  const cached = unstable_cache(() => loadUpstreamCatalog(geminiApiKey), ['public-gemini-models-catalog'], {
    revalidate: MODELS_CATALOG_REVALIDATE_SECONDS,
  })

  try {
    return await cached()
  } catch {
    return fallbackCatalog(true)
  }
}
