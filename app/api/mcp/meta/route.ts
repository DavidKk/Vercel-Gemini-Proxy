import { NextResponse } from 'next/server'

import { loadAuthEnv } from '@/services/gemini/auth'
import { MCP_INSTALL_SERVER_KEY } from '@/services/mcp/installSnippets'
import { SKILL_PUBLIC_PATH, SKILL_RESOURCE_URI } from '@/services/mcp/skillResources'

/**
 * Public MCP/Skill meta for the header dialog.
 * Returns header *names* only (no secret values). MCP is proxy-mode only.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const origin = url.origin
  const auth = loadAuthEnv()
  const headerNames = auth.proxyAuthHeaders.map((pair) => pair.name)
  const proxyConfigured = headerNames.length > 0
  const headerPlaceholders = proxyConfigured ? Object.fromEntries(headerNames.map((name) => [name, '<your-proxy-secret>'])) : {}

  return NextResponse.json({
    endpoint: `${origin}/api/mcp`,
    skillUrl: `${origin}${SKILL_PUBLIC_PATH}`,
    skillResourceUri: SKILL_RESOURCE_URI,
    serverKey: MCP_INSTALL_SERVER_KEY,
    proxyConfigured,
    geminiKeyConfigured: Boolean(auth.geminiApiKey),
    headerNames,
    headerPlaceholders,
    authHint: proxyConfigured
      ? `Proxy only: send ${headerNames.join(', ')} (values from PROXY_AUTH_HEADERS). Gemini key passthrough is not accepted on MCP.`
      : 'MCP requires PROXY_AUTH_HEADERS (+ GEMINI_API_KEYS) on the server. Set env and redeploy, then install again.',
  })
}
