import {
  buildStreamGenerateBody,
  consumeStreamBuffer,
  extractGroundingSources,
  extractTextFromChunk,
  extractUsageMetadata,
  formatUsageLabel,
  isAbortError,
  mergeGroundingSources,
  toGeminiContents,
} from '@/lib/playground/gemini-client'

describe('playground gemini-client helpers', () => {
  it('maps playground roles to Gemini contents', () => {
    expect(
      toGeminiContents([
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello' },
        { role: 'user', content: '  ' },
      ])
    ).toEqual([
      { role: 'user', parts: [{ text: 'hi' }] },
      { role: 'model', parts: [{ text: 'hello' }] },
    ])
  })

  it('builds generate body without tools by default', () => {
    const contents = [{ role: 'user' as const, parts: [{ text: 'hi' }] }]
    expect(buildStreamGenerateBody(contents)).toEqual({ contents })
    expect(buildStreamGenerateBody(contents, false)).toEqual({ contents })
  })

  it('adds google_search tool when enabled', () => {
    const contents = [{ role: 'user' as const, parts: [{ text: 'gold price' }] }]
    expect(buildStreamGenerateBody(contents, true)).toEqual({
      contents,
      tools: [{ google_search: {} }],
    })
  })

  it('extracts and merges grounding sources', () => {
    expect(
      extractGroundingSources({
        candidates: [
          {
            groundingMetadata: {
              groundingChunks: [{ web: { title: 'Kitco', uri: 'https://kitco.com' } }, { web: { uri: 'https://example.com' } }, { web: { title: 'missing' } }],
            },
          },
        ],
      })
    ).toEqual([
      { title: 'Kitco', uri: 'https://kitco.com' },
      { title: 'https://example.com', uri: 'https://example.com' },
    ])

    expect(
      mergeGroundingSources(
        [{ title: 'A', uri: 'https://a.test' }],
        [
          { title: 'A again', uri: 'https://a.test' },
          { title: 'B', uri: 'https://b.test' },
        ]
      )
    ).toEqual([
      { title: 'A', uri: 'https://a.test' },
      { title: 'B', uri: 'https://b.test' },
    ])
  })

  it('maps user image to inline_data (with optional text)', () => {
    const dataUrl = 'data:image/png;base64,aGVsbG8='
    expect(
      toGeminiContents([
        {
          role: 'user',
          content: 'what is this?',
          image: { mimeType: 'image/png', dataUrl },
        },
      ])
    ).toEqual([
      {
        role: 'user',
        parts: [{ inline_data: { mime_type: 'image/png', data: 'aGVsbG8=' } }, { text: 'what is this?' }],
      },
    ])
  })

  it('keeps image-only user messages', () => {
    expect(
      toGeminiContents([
        {
          role: 'user',
          content: '  ',
          image: { mimeType: 'image/jpeg', dataUrl: 'data:image/jpeg;base64,abc' },
        },
      ])
    ).toEqual([
      {
        role: 'user',
        parts: [{ inline_data: { mime_type: 'image/jpeg', data: 'abc' } }],
      },
    ])
  })

  it('detects AbortError', () => {
    expect(isAbortError(new DOMException('The operation was aborted.', 'AbortError'))).toBe(true)
    expect(isAbortError(new Error('boom'))).toBe(false)
  })

  it('consumes complete SSE lines and keeps incomplete JSON', () => {
    const first = consumeStreamBuffer('data: {"candidates":[{"content":{"parts":[{"text":"你"}]}}]}\n')
    expect(first.events).toHaveLength(1)
    expect(extractTextFromChunk(first.events[0])).toBe('你')
    expect(first.rest).toBe('')

    const partial = consumeStreamBuffer('data: {"candidates":[{"content":{"parts":[{"text":"在的')
    expect(partial.events).toHaveLength(0)
    expect(partial.rest.startsWith('data:')).toBe(true)

    const completed = consumeStreamBuffer(partial.rest + '"}]}}]}\n')
    expect(completed.events).toHaveLength(1)
    expect(extractTextFromChunk(completed.events[0])).toBe('在的')
  })

  it('extracts and formats usageMetadata', () => {
    expect(extractUsageMetadata({ candidates: [] })).toBeNull()
    expect(
      extractUsageMetadata({
        usageMetadata: {
          promptTokenCount: 12,
          candidatesTokenCount: 34,
          totalTokenCount: 50,
          thoughtsTokenCount: 4,
        },
      })
    ).toEqual({
      promptTokenCount: 12,
      candidatesTokenCount: 34,
      totalTokenCount: 50,
      thoughtsTokenCount: 4,
    })
    expect(
      formatUsageLabel({
        promptTokenCount: 12,
        candidatesTokenCount: 34,
        totalTokenCount: 50,
        thoughtsTokenCount: 4,
      })
    ).toBe('50 tokens · in 12 · out 34 · thoughts 4')
  })
})
