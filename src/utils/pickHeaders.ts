export const pickHeaders = (headers: Headers, keys: (string | RegExp)[]): Headers => {
  const picked = new Headers()

  for (const key of headers.keys()) {
    if (keys.some((k) => (typeof k === 'string' ? k === key : k.test(key)))) {
      const value = headers.get(key)
      if (typeof value === 'string') {
        picked.set(key, value)
      }
    }
  }

  return picked
}
