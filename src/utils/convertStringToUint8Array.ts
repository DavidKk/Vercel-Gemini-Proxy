export function convertStringToUint8Array(content: string) {
  if (typeof content === 'string') {
    const encoder = new TextEncoder()
    return encoder.encode(content)
  }

  return content
}
