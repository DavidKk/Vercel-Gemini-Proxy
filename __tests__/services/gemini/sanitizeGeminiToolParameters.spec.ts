import { sanitizeGeminiToolParametersInPayload } from '@/services/gemini/sanitizeGeminiToolParameters'

describe('sanitizeGeminiToolParametersInPayload', () => {
  it('should strip additionalProperties and default from functionDeclarations parameters', () => {
    const payload = {
      tools: [
        {
          functionDeclarations: [
            {
              name: 'vws__page__outline',
              parameters: {
                type: 'object',
                properties: { clear: { type: 'boolean', default: true } },
                additionalProperties: false,
              },
            },
          ],
        },
      ],
    }

    expect(sanitizeGeminiToolParametersInPayload(payload)).toBe(true)
    expect(payload.tools[0]?.functionDeclarations[0]?.parameters).toEqual({
      type: 'object',
      properties: { clear: { type: 'boolean' } },
    })
  })

  it('should support snake_case function_declarations', () => {
    const payload = {
      tools: [
        {
          function_declarations: [
            {
              name: 'x',
              parameters: { type: 'object', properties: {}, additionalProperties: false },
            },
          ],
        },
      ],
    }

    expect(sanitizeGeminiToolParametersInPayload(payload)).toBe(true)
    expect((payload.tools[0] as { function_declarations: Array<{ parameters: unknown }> }).function_declarations[0]?.parameters).toEqual({
      type: 'object',
      properties: {},
    })
  })

  it('should return false when tools are absent', () => {
    expect(sanitizeGeminiToolParametersInPayload({ contents: [] })).toBe(false)
  })
})
