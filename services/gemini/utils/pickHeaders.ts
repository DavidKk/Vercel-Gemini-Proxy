export function pickHeaders(headers: Headers, keys: (string | RegExp)[]) {
  const picked: Record<string, string> = {}
  headers.forEach((_, key) => {
    if (keys.some((k) => (typeof k === 'string' ? k === key : k.test(key)))) {
      const value = headers.get(key)
      if (typeof value === 'string') {
        picked[key] = value
      }
    }
  })

  return picked
}
