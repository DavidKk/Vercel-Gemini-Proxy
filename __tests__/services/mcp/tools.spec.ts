import { createMcpService, handleMcpJsonRpc } from '@/services/mcp/handler'
import { createMcpTools } from '@/services/mcp/tools'

describe('createMcpTools', () => {
  it('exposes only gemini_list_models', () => {
    expect(Object.keys(createMcpTools()).sort()).toEqual(['gemini_list_models'])
  })
})

describe('createMcpService / tools/list', () => {
  it('lists a single smoke-test tool and no generateContent', async () => {
    const service = createMcpService({ mode: 'auth' })
    const response = await handleMcpJsonRpc(service, { jsonrpc: '2.0', id: 1, method: 'tools/list' } as never, 'unused-key')
    const body = (await response.json()) as {
      result: { tools: Array<{ name: string }> }
    }
    expect(body.result.tools.map((t) => t.name)).toEqual(['gemini_list_models'])
  })

  it('rejects unknown generate tool', async () => {
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
