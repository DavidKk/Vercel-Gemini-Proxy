import { NextResponse } from 'next/server'

import { loadAuthEnv } from '@/services/gemini/auth'
import { isMcpInstallEnabled } from '@/services/mcp/handler'
import { MCP_AUTH_SERVER_KEY, MCP_INSTALL_SERVER_KEY } from '@/services/mcp/installSnippets'
import { SKILL_PUBLIC_PATH, SKILL_RESOURCE_URI } from '@/services/mcp/skillResources'

/**
 * Public MCP/Skill meta for the header dialog.
 * Exposes install (public bootstrap) + auth (proxy) endpoints; header names only (no secrets).
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const origin = url.origin
  const auth = loadAuthEnv()
  const headerNames = auth.proxyAuthHeaders.map((pair) => pair.name)
  const proxyConfigured = headerNames.length > 0
  const headerPlaceholders = proxyConfigured ? Object.fromEntries(headerNames.map((name) => [name, '<your-proxy-secret>'])) : {}
  const installEnabled = isMcpInstallEnabled()

  return NextResponse.json({
    skillUrl: `${origin}${SKILL_PUBLIC_PATH}`,
    skillResourceUri: SKILL_RESOURCE_URI,
    installEnabled,
    installEndpoint: `${origin}/api/mcp/install`,
    installServerKey: MCP_INSTALL_SERVER_KEY,
    endpoint: `${origin}/api/mcp`,
    serverKey: MCP_AUTH_SERVER_KEY,
    proxyConfigured,
    geminiKeyConfigured: Boolean(auth.geminiApiKey),
    headerNames,
    headerPlaceholders,
    authHint: installEnabled
      ? proxyConfigured
        ? `Use install MCP (no secret) for Skill/deploy docs, then switch to auth MCP with ${headerNames.join(', ')}.`
        : 'Use install MCP (no secret) for Skill/deploy docs. After PROXY_AUTH_HEADERS + GEMINI_API_KEYS, switch to auth MCP.'
      : proxyConfigured
        ? `Install MCP is offline. Use auth MCP with ${headerNames.join(', ')} (PROXY_AUTH_HEADERS).`
        : 'Install MCP is offline. Set PROXY_AUTH_HEADERS + GEMINI_API_KEYS, then use auth MCP.',
  })
}
