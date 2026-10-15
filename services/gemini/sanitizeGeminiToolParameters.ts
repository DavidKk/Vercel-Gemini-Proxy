/** JSON Schema keys Gemini functionDeclarations.parameters reject (proto Schema subset). */
const GEMINI_PARAMETERS_STRIP_KEYS = new Set([
  'additionalProperties',
  '$schema',
  '$id',
  '$ref',
  '$defs',
  'definitions',
  'examples',
  'default',
  'unevaluatedProperties',
  'patternProperties',
])

function sanitizeSchemaNode(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeSchemaNode(entry))
  }
  if (!value || typeof value !== 'object') {
    return value
  }
  const out: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (GEMINI_PARAMETERS_STRIP_KEYS.has(key)) {
      continue
    }
    out[key] = sanitizeSchemaNode(child)
  }
  return out
}

/**
 * Strip Gemini-incompatible JSON Schema keys from generateContent `tools`.
 * Keeps official upstream errors for real payload problems; only removes known
 * Schema fields that Gemini's functionDeclarations.parameters proto rejects.
 * @param payload Parsed request JSON body
 * @returns Whether any tool parameters were rewritten
 */
export function sanitizeGeminiToolParametersInPayload(payload: Record<string, unknown>): boolean {
  const tools = payload.tools
  if (!Array.isArray(tools) || tools.length === 0) {
    return false
  }

  let changed = false
  for (const tool of tools) {
    if (!tool || typeof tool !== 'object') {
      continue
    }
    const record = tool as Record<string, unknown>
    const declarations = record.functionDeclarations ?? record.function_declarations
    if (!Array.isArray(declarations)) {
      continue
    }
    for (const declaration of declarations) {
      if (!declaration || typeof declaration !== 'object') {
        continue
      }
      const decl = declaration as Record<string, unknown>
      if (!('parameters' in decl)) {
        continue
      }
      const before = JSON.stringify(decl.parameters)
      decl.parameters = sanitizeSchemaNode(decl.parameters)
      if (JSON.stringify(decl.parameters) !== before) {
        changed = true
      }
    }
  }

  return changed
}
