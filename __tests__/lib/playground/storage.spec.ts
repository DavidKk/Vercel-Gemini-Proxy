import {
  clearMessages,
  isModelsCacheFresh,
  loadMessages,
  loadModelsCache,
  resolveApiRoot,
  saveMessages,
  saveModelsCache,
  stripModelPrefix,
  trimTrailingSlash,
} from '@/lib/playground/storage'
import { DEFAULT_API_ROOT, MODELS_CACHE_TTL_MS } from '@/lib/playground/types'

describe('playground storage helpers', () => {
  it('trims trailing slashes', () => {
    expect(trimTrailingSlash('https://example.com/v1beta///')).toBe('https://example.com/v1beta')
  })

  it('always resolves same-origin proxy api root', () => {
    expect(resolveApiRoot({ useCustomBaseUrl: false, baseUrl: 'https://ignored' })).toBe(DEFAULT_API_ROOT)
    expect(resolveApiRoot({ useCustomBaseUrl: true, baseUrl: 'https://example.com/api/v1beta/' })).toBe(DEFAULT_API_ROOT)
    expect(resolveApiRoot({ useCustomBaseUrl: true, baseUrl: '  ' })).toBe(DEFAULT_API_ROOT)
  })

  it('strips models/ prefix', () => {
    expect(stripModelPrefix('models/gemini-2.5-flash')).toBe('gemini-2.5-flash')
    expect(stripModelPrefix('gemini-2.5-flash')).toBe('gemini-2.5-flash')
  })

  it('treats models cache as fresh within 1 day', () => {
    const now = 1_700_000_000_000
    expect(isModelsCacheFresh(now - MODELS_CACHE_TTL_MS + 1, now)).toBe(true)
    expect(isModelsCacheFresh(now - MODELS_CACHE_TTL_MS - 1, now)).toBe(false)
  })

  it('round-trips models cache for matching apiRoot', () => {
    const store: Record<string, string> = {}
    const localStorageMock = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
      removeItem: (key: string) => {
        delete store[key]
      },
    }
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: localStorageMock },
      configurable: true,
    })
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    })

    saveModelsCache('/api/v1beta', ['gemini-2.5-flash', 'gemini-2.5-pro'], Date.now())
    expect(loadModelsCache('/api/v1beta')).toEqual(['gemini-2.5-flash', 'gemini-2.5-pro'])
    expect(loadModelsCache('https://other.example/v1beta')).toBeNull()
  })

  it('round-trips messages and drops trailing empty assistant', () => {
    const store: Record<string, string> = {}
    const localStorageMock = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
      removeItem: (key: string) => {
        delete store[key]
      },
    }
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: localStorageMock },
      configurable: true,
    })
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    })

    const messages = [
      { id: '1', role: 'user' as const, content: 'hi', createdAt: 1 },
      { id: '2', role: 'assistant' as const, content: 'hello', createdAt: 2 },
      { id: '3', role: 'assistant' as const, content: '  ', createdAt: 3 },
    ]
    saveMessages(messages)
    expect(loadMessages()).toEqual([
      { id: '1', role: 'user', content: 'hi', createdAt: 1 },
      { id: '2', role: 'assistant', content: 'hello', createdAt: 2 },
    ])

    clearMessages()
    expect(loadMessages()).toEqual([])
  })
})
