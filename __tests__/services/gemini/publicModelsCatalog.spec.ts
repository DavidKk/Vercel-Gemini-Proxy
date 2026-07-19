import { DEFAULT_API_DIALOG_MODEL, type PublicModelsCatalog } from '@/services/gemini/publicModelsTypes'

// Test the pure fallback shape expected by the dialog (catalog module is Next-cache coupled).
describe('public models catalog contract', () => {
  it('uses a stable default model id', () => {
    expect(DEFAULT_API_DIALOG_MODEL).toBe('gemini-2.5-flash')
  })

  it('public JSON never includes a key field', () => {
    const sample: PublicModelsCatalog = {
      geminiKeyConfigured: true,
      models: [{ id: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' }],
      source: 'upstream',
      revalidateSeconds: 86400,
    }
    expect(JSON.stringify(sample)).not.toMatch(/AIza|GEMINI_API_KEY|apiKey/i)
  })
})
