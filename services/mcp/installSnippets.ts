/**
 * Cursor / VS Code MCP one-click install helpers.
 * {@link MCP_INSTALL_SERVER_KEY} must match MCP manifest `name`.
 */

export const MCP_INSTALL_SERVER_KEY = 'gemini-relay'

export function normalizeMcpAuthHeaders(headers?: Record<string, string> | null): Record<string, string> | undefined {
  if (!headers) {
    return undefined
  }
  const entries = Object.entries(headers).filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
  if (entries.length === 0) {
    return undefined
  }
  return Object.fromEntries(entries)
}

function utf8JsonToBase64(json: string): string {
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

export function buildCursorMcpJson(mcpHttpUrl: string, serverKey: string = MCP_INSTALL_SERVER_KEY, headers?: Record<string, string> | null): string {
  const h = normalizeMcpAuthHeaders(headers ?? undefined)
  const entry: Record<string, unknown> = { url: mcpHttpUrl }
  if (h) {
    entry.headers = h
  }
  return JSON.stringify({ mcpServers: { [serverKey]: entry } }, null, 2)
}

export function buildCursorMcpInstallDeepLink(mcpHttpUrl: string, serverKey: string = MCP_INSTALL_SERVER_KEY, headers?: Record<string, string> | null): string {
  const h = normalizeMcpAuthHeaders(headers ?? undefined)
  const configObj: Record<string, unknown> = { url: mcpHttpUrl }
  if (h) {
    configObj.headers = h
  }
  const config = encodeURIComponent(utf8JsonToBase64(JSON.stringify(configObj)))
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(serverKey)}&config=${config}`
}

export type VsCodeMcpInstallChannel = 'stable' | 'insiders'

export function buildVsCodeMcpInstallDeepLink(
  mcpHttpUrl: string,
  serverKey: string = MCP_INSTALL_SERVER_KEY,
  channel: VsCodeMcpInstallChannel = 'stable',
  headers?: Record<string, string> | null
): string {
  const h = normalizeMcpAuthHeaders(headers ?? undefined)
  const payload = {
    name: serverKey,
    type: 'http' as const,
    url: mcpHttpUrl,
    headers: h ?? {},
  }
  const scheme = channel === 'insiders' ? 'vscode-insiders' : 'vscode'
  return `${scheme}:mcp/install?${encodeURIComponent(JSON.stringify(payload))}`
}
