import type { NextRequest } from 'next/server'

import { loadAuthEnv, resolveMcpAuth } from '@/services/gemini/auth'
import { pickKeyLeastTokensToday } from '@/services/gemini/keyRotation'
import { createMcpService, handleMcpJsonRpc, mcpBadRequest, mcpManifestResponse, mcpUnauthorized } from '@/services/mcp/handler'

const service = createMcpService({ mode: 'auth' })

function authorize(req: NextRequest) {
  return resolveMcpAuth(req.headers, loadAuthEnv())
}

function authFailure(auth: { ok: false; status: number; message: string }) {
  if (auth.status === 503) {
    return Response.json({ error: auth.message }, { status: 503 })
  }
  return mcpUnauthorized()
}

/** GET /api/mcp — auth MCP manifest. Proxy auth required. */
export async function GET(req: NextRequest) {
  const auth = authorize(req)
  if (!auth.ok) {
    return authFailure(auth)
  }
  return mcpManifestResponse(service)
}

/** POST /api/mcp — auth MCP JSON-RPC. Proxy auth required for all methods. */
export async function POST(req: NextRequest) {
  const authResult = authorize(req)
  if (!authResult.ok) {
    return authFailure(authResult)
  }

  const body = await req.json().catch(() => null)
  if (body == null || typeof body !== 'object') {
    return mcpBadRequest('Invalid JSON body')
  }

  const isJsonRpc = (body as { jsonrpc?: string; method?: string }).jsonrpc === '2.0' && typeof (body as { method?: string }).method === 'string'
  if (!isJsonRpc) {
    return mcpBadRequest('Expected JSON-RPC 2.0 body with method')
  }

  const authEnv = loadAuthEnv()
  const geminiApiKey = await pickKeyLeastTokensToday(authEnv.geminiApiKeys)
  return handleMcpJsonRpc(service, body as { id?: string | number | null; method?: string; params?: unknown }, geminiApiKey)
}
