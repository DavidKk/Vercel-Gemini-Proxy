describe('getRequestOrigin', () => {
  it('builds origin from x-forwarded-host and x-forwarded-proto', async () => {
    jest.resetModules()
    jest.doMock('next/headers', () => ({
      headers: async () =>
        new Headers({
          'x-forwarded-host': 'relay.example.com',
          'x-forwarded-proto': 'https',
        }),
    }))
    const { getRequestOrigin: getOrigin } = await import('@/lib/request-origin')
    await expect(getOrigin()).resolves.toBe('https://relay.example.com')
  })

  it('uses http for localhost host header', async () => {
    jest.resetModules()
    jest.doMock('next/headers', () => ({
      headers: async () => new Headers({ host: 'localhost:3000' }),
    }))
    const { getRequestOrigin: getOrigin } = await import('@/lib/request-origin')
    await expect(getOrigin()).resolves.toBe('http://localhost:3000')
  })
})
