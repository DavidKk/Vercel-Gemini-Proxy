import { buildChatRailSegments, resolveRailBarWidthPercent, truncateRailPreview } from '@/lib/playground/chat-rail'

describe('playground chat-rail helpers', () => {
  it('truncates long previews with ellipsis', () => {
    expect(truncateRailPreview('short')).toBe('short')
    expect(truncateRailPreview('a'.repeat(200)).endsWith('…')).toBe(true)
    expect(truncateRailPreview('a'.repeat(200)).length).toBe(160)
  })

  it('maps content length to bar width percent', () => {
    expect(resolveRailBarWidthPercent('', '')).toBe(36)
    expect(resolveRailBarWidthPercent('hi', 'there')).toBeGreaterThanOrEqual(30)
    expect(resolveRailBarWidthPercent('x'.repeat(400), 'y'.repeat(400))).toBe(100)
  })

  it('returns empty segments for empty messages', () => {
    expect(buildChatRailSegments([])).toEqual([])
  })

  it('pairs user then assistant into one segment', () => {
    expect(
      buildChatRailSegments([
        { id: 'u1', role: 'user', content: 'hello' },
        { id: 'a1', role: 'assistant', content: 'world' },
      ])
    ).toEqual([
      {
        id: 'u1',
        userPreview: 'hello',
        assistantPreview: 'world',
      },
    ])
  })

  it('starts a new segment on each user message', () => {
    const segments = buildChatRailSegments([
      { id: 'u1', role: 'user', content: 'one' },
      { id: 'a1', role: 'assistant', content: 'a' },
      { id: 'u2', role: 'user', content: 'two' },
      { id: 'a2', role: 'assistant', content: 'b', streaming: true },
    ])
    expect(segments).toHaveLength(2)
    expect(segments[0]).toMatchObject({ id: 'u1', userPreview: 'one', assistantPreview: 'a' })
    expect(segments[1]).toMatchObject({ id: 'u2', userPreview: 'two', assistantPreview: 'b', streaming: true })
  })

  it('keeps orphan assistant as its own segment', () => {
    expect(buildChatRailSegments([{ id: 'a1', role: 'assistant', content: 'solo' }])).toEqual([{ id: 'a1', userPreview: '', assistantPreview: 'solo' }])
  })

  it('keeps user-only turns', () => {
    expect(buildChatRailSegments([{ id: 'u1', role: 'user', content: 'only me' }])).toEqual([{ id: 'u1', userPreview: 'only me', assistantPreview: '' }])
  })
})
