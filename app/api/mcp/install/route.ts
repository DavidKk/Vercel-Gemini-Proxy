import type { NextRequest } from 'next/server'

import { createMcpService, handleMcpJsonRpc, isMcpInstallEnabled, mcpBadRequest, mcpInstallDisabled, mcpManifestResponse } from '@/services/mcp/handler'

const service = createMcpService({ mode: 'install' })

/** GET /api/mcp/install — public bootstrap MCP (Skill only). Disable with MCP_INSTALL_ENABLED=false. */
export async function GET() {
  if (!isMcpInstallEnabled()) {
    return mcpInstallDisabled()
  }
  return mcpManifestResponse(service)
}

/** POST /api/mcp/install — public JSON-RPC for Skill bootstrap (no tools). */
export async function POST(req: NextRequest) {
  if (!isMcpInstallEnabled()) {
    return mcpInstallDisabled()
  }

  const body = await req.json().catch(() => null)
  if (body == null || typeof body !== 'object') {
    return mcpBadRequest('Invalid JSON body')
  }

  const isJsonRpc = (body as { jsonrpc?: string; method?: string }).jsonrpc === '2.0' && typeof (body as { method?: string }).method === 'string'
  if (!isJsonRpc) {
    return mcpBadRequest('Expected JSON-RPC 2.0 body with method')
  }

  return handleMcpJsonRpc(service, body as { id?: string | number | null; method?: string; params?: unknown }, '')
}
