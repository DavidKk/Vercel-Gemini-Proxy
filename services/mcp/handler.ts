import { NextResponse } from 'next/server'

import { MCP_INSTALL_SERVER_KEY } from '@/services/mcp/installSnippets'
import { createMcpSkillResourceProvider, type McpManifestResource } from '@/services/mcp/skillResources'
import { createMcpTools, type McpTool } from '@/services/mcp/tools'

const CACHE_CONTROL_NO_STORE = 'private, no-store'

const JSONRPC = {
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const

function noStore(res: NextResponse) {
  res.headers.set('Cache-Control', CACHE_CONTROL_NO_STORE)
  return res
}

function jsonRpcSuccess(id: string | number | null, result: unknown) {
  return noStore(NextResponse.json({ jsonrpc: '2.0', id, result }))
}

function jsonRpcError(id: string | number | null, code: number, message: string) {
  return noStore(NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } }))
}

export type McpService = {
  name: string
  version: string
  description: string
  tools: Map<string, McpTool>
  resources: ReturnType<typeof createMcpSkillResourceProvider>
}

export function createMcpService(): McpService {
  const toolsRecord = createMcpTools()
  return {
    name: MCP_INSTALL_SERVER_KEY,
    version: '1.0.0',
    description: 'Gemini Relay HTTP MCP — skill docs + list-models smoke test (proxy auth only).',
    tools: new Map(Object.entries(toolsRecord)),
    resources: createMcpSkillResourceProvider(),
  }
}

function buildManifest(service: McpService) {
  const tools: Record<string, { description?: string; inputSchema: unknown }> = {}
  for (const [name, tool] of service.tools) {
    tools[name] = { description: tool.description, inputSchema: tool.inputSchema }
  }
  const resources: McpManifestResource[] = service.resources.listResources()
  return {
    name: service.name,
    version: service.version,
    description: service.description,
    tools,
    resources,
  }
}

export function mcpManifestResponse(service: McpService) {
  return noStore(NextResponse.json({ type: 'result', result: buildManifest(service) }))
}

export async function handleMcpJsonRpc(service: McpService, body: { id?: string | number | null; method?: string; params?: unknown }, geminiApiKey: string) {
  const id = body.id ?? null

  if (body.method === 'initialize') {
    const protocolVersion = (body.params && (body.params as { protocolVersion?: string }).protocolVersion) || '2025-06-18'
    return jsonRpcSuccess(id, {
      protocolVersion,
      capabilities: {
        tools: { listChanged: false },
        resources: { subscribe: false, listChanged: false },
      },
      serverInfo: {
        name: service.name,
        version: service.version,
        description: service.description,
      },
    })
  }

  if (body.method === 'tools/list') {
    const tools = Array.from(service.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }))
    return jsonRpcSuccess(id, { tools })
  }

  if (body.method === 'resources/list') {
    return jsonRpcSuccess(id, { resources: service.resources.listResources() })
  }

  if (body.method === 'resources/read') {
    const uri = (body.params as { uri?: unknown } | undefined)?.uri
    if (!uri || typeof uri !== 'string') {
      return jsonRpcError(id, JSONRPC.INVALID_PARAMS, 'Missing or invalid "params.uri" for resources/read')
    }
    try {
      const content = await service.resources.readResource(uri.trim())
      if (!content) {
        return jsonRpcError(id, JSONRPC.INVALID_PARAMS, `Unknown resource URI: ${uri}`)
      }
      return jsonRpcSuccess(id, {
        contents: [{ uri: uri.trim(), mimeType: content.mimeType, text: content.text }],
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return jsonRpcError(id, JSONRPC.INTERNAL_ERROR, `Failed to read resource: ${message}`)
    }
  }

  if (body.method === 'tools/call') {
    const params = (body.params ?? {}) as { name?: string; arguments?: Record<string, unknown> }
    const toolName = params.name
    const args = params.arguments ?? {}
    if (!toolName || typeof toolName !== 'string') {
      return jsonRpcError(id, JSONRPC.INVALID_PARAMS, 'Missing or invalid "params.name"')
    }
    const tool = service.tools.get(toolName)
    if (!tool) {
      return jsonRpcError(id, JSONRPC.INVALID_PARAMS, `Unknown tool: ${toolName}`)
    }
    try {
      const result = await tool.call(args, geminiApiKey)
      return jsonRpcSuccess(id, {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        isError: false,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return jsonRpcSuccess(id, {
        content: [{ type: 'text', text: message }],
        isError: true,
      })
    }
  }

  if (body.method === 'notifications/initialized' || body.method === 'ping') {
    return jsonRpcSuccess(id, {})
  }

  return jsonRpcError(id, JSONRPC.METHOD_NOT_FOUND, `Method not found: ${body.method ?? 'undefined'}`)
}

export function mcpUnauthorized() {
  return noStore(NextResponse.json({ error: 'No permission' }, { status: 401 }))
}

export function mcpBadRequest(message: string) {
  return noStore(NextResponse.json({ type: 'error', error: { code: 'invalid_argument', message } }, { status: 400 }))
}
