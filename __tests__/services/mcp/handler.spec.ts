import { createMcpService, handleMcpJsonRpc, isMcpInstallEnabled } from '@/services/mcp/handler'
import { MCP_AUTH_SERVER_KEY, MCP_INSTALL_SERVER_KEY } from '@/services/mcp/installSnippets'
import { createMcpTools } from '@/services/mcp/tools'

describe('createMcpTools', () => {
  it('exposes only gemini_list_models', () => {
    expect(Object.keys(createMcpTools()).sort()).toEqual(['gemini_list_models'])
  })
})

describe('createMcpService modes', () => {
  it('auth mode lists smoke-test tool', async () => {
    const service = createMcpService({ mode: 'auth' })
    expect(service.name).toBe(MCP_AUTH_SERVER_KEY)
    const response = await handleMcpJsonRpc(service, { jsonrpc: '2.0', id: 1, method: 'tools/list' } as never, 'unused-key')
    const body = (await response.json()) as {
      result: { tools: Array<{ name: string }> }
    }
    expect(body.result.tools.map((t) => t.name)).toEqual(['gemini_list_models'])
  })

  it('install mode has no tools', async () => {
    const service = createMcpService({ mode: 'install' })
    expect(service.name).toBe(MCP_INSTALL_SERVER_KEY)
    expect(service.tools.size).toBe(0)
    const response = await handleMcpJsonRpc(service, { jsonrpc: '2.0', id: 1, method: 'tools/list' } as never, '')
    const body = (await response.json()) as { result: { tools: unknown[] } }
    expect(body.result.tools).toEqual([])
  })

  it('auth mode rejects unknown generate tool', async () => {
    const service = createMcpService({ mode: 'auth' })
    const response = await handleMcpJsonRpc(
      service,
      {
        id: 2,
        method: 'tools/call',
        params: { name: 'gemini_generate_content', arguments: { model: 'x', text: 'y' } },
      },
      'unused-key'
    )
    const body = (await response.json()) as { error?: { message?: string } }
    expect(body.error?.message).toMatch(/Unknown tool/)
  })
})

describe('isMcpInstallEnabled', () => {
  it('defaults to enabled', () => {
    expect(isMcpInstallEnabled({})).toBe(true)
    expect(isMcpInstallEnabled({ MCP_INSTALL_ENABLED: '' })).toBe(true)
  })

  it('disables for falsey flags', () => {
    expect(isMcpInstallEnabled({ MCP_INSTALL_ENABLED: 'false' })).toBe(false)
    expect(isMcpInstallEnabled({ MCP_INSTALL_ENABLED: '0' })).toBe(false)
    expect(isMcpInstallEnabled({ MCP_INSTALL_ENABLED: 'off' })).toBe(false)
    expect(isMcpInstallEnabled({ MCP_INSTALL_ENABLED: 'no' })).toBe(false)
  })

  it('enables for true-like values', () => {
    expect(isMcpInstallEnabled({ MCP_INSTALL_ENABLED: 'true' })).toBe(true)
    expect(isMcpInstallEnabled({ MCP_INSTALL_ENABLED: '1' })).toBe(true)
  })
})
