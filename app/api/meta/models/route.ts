import { NextResponse } from 'next/server'

import { getPublicModelsCatalog, MODELS_CATALOG_REVALIDATE_SECONDS } from '@/services/gemini/publicModelsCatalog'

/**
 * Public model list for the API dialog.
 * Uses server GEMINI_API_KEY when set; never exposes the key. Cached ~1 day.
 */
export async function GET() {
  const catalog = await getPublicModelsCatalog()
  const res = NextResponse.json(catalog)
  res.headers.set('Cache-Control', `public, s-maxage=${MODELS_CATALOG_REVALIDATE_SECONDS}, stale-while-revalidate=3600`)
  return res
}
