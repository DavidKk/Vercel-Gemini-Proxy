export const convertStringToUint8Array = (content: string) => {
  if (typeof content === 'string') {
    const encoder = new TextEncoder()
    encoder.encode(content)
  }

  return content
}
