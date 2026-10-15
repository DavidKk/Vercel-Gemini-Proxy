import { createOfficialGeminiErrorResponse, geminiErrorStatusName, passthroughUpstreamErrorResponse } from '@/services/gemini/libs/response/createOfficialGeminiErrorResponse'

describe('createOfficialGeminiErrorResponse', () => {
  it('should map common HTTP statuses to Gemini error.status names', () => {
    expect(geminiErrorStatusName(400)).toBe('INVALID_ARGUMENT')
    expect(geminiErrorStatusName(429)).toBe('RESOURCE_EXHAUSTED')
    expect(geminiErrorStatusName(504)).toBe('DEADLINE_EXCEEDED')
  })

  it('should return an official-shaped JSON error body', async () => {
    const response = createOfficialGeminiErrorResponse(504, 'timed out', 'DEADLINE_EXCEEDED')
    expect(response.status).toBe(504)
    expect(response.headers.get('Content-Type')).toBe('application/json')
    await expect(response.json()).resolves.toEqual({
      error: { code: 504, message: 'timed out', status: 'DEADLINE_EXCEEDED' },
    })
  })

  it('should passthrough upstream error status and body', async () => {
    const upstream = new Response('{"error":{"code":400,"message":"bad","status":"INVALID_ARGUMENT"}}', {
      status: 400,
      statusText: 'Bad Request',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    })
    const response = passthroughUpstreamErrorResponse(upstream, await upstream.text())
    expect(response.status).toBe(400)
    expect(response.headers.get('Content-Type')).toBe('application/json; charset=UTF-8')
    await expect(response.json()).resolves.toEqual({
      error: { code: 400, message: 'bad', status: 'INVALID_ARGUMENT' },
    })
  })
})
