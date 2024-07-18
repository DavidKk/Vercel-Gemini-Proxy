import { handleRequest } from '@/handleRequest'
import type { Message } from '@/types/message'
import { createContext } from '@/createContext'

describe('test handleRequest', () => {
  it('should return a 200 response with the correct content-type header', async () => {
    global.fetch = jest.fn().mockImplementation(async () => new Response('ok'))

    const message: Pick<Message, 'contents'> = {
      contents: [
        {
          role: 'user',
          parts: [{ text: 'hello world' }],
        },
      ],
    }

    const request = new Request('https://example.com/api/v1/projects/my-project/locations/us-central1/agents/my-agent/sessions/1234567890:detectIntent?key=123', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    const response = await handleRequest(createContext(request))
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/json')
  })
})
