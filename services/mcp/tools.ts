import { GOOGLE_GEMINI_API_URL } from '@/services/gemini/constants'

export type McpTool = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  call: (args: Record<string, unknown>, geminiApiKey: string) => Promise<unknown>
}

async function upstreamGet(pathname: string, geminiApiKey: string): Promise<unknown> {
  const url = new URL(pathname, `${GOOGLE_GEMINI_API_URL}/`)
  url.searchParams.set('key', geminiApiKey)
  const response = await fetch(url, { method: 'GET', cache: 'no-store' })
  const text = await response.text()
  let body: unknown = text
  try {
    body = JSON.parse(text) as unknown
  } catch {
    // keep text
  }
  if (!response.ok) {
    throw new Error(typeof body === 'object' && body ? JSON.stringify(body) : text || `HTTP ${response.status}`)
  }
  return body
}

/**
 * MCP tools — smoke-test surface only (not a full Gemini SDK).
 * Generation / streaming stays on REST + Playground.
 */
export function createMcpTools(): Record<string, McpTool> {
  return {
    gemini_list_models: {
      name: 'gemini_list_models',
      description: 'Smoke-test this relay: list Gemini models via v1beta (proxy auth + server GEMINI_API_KEYS). Prefer REST/Playground for generateContent.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      async call(_args, geminiApiKey) {
        return upstreamGet('v1beta/models', geminiApiKey)
      },
    },
  }
}
