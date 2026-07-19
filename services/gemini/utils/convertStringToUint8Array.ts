export function convertStringToUint8Array(content: string | Uint8Array): Uint8Array {
  if (typeof content === 'string') {
    const encoder = new TextEncoder()
    return encoder.encode(content)
  }

  return content
}
