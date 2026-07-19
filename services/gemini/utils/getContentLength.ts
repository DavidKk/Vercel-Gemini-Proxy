export function getContentLength(headers: Headers) {
  const contentLength = headers.get('content-length')
  const length = contentLength ? parseInt(contentLength, 10) : 0
  return isNaN(length) ? 0 : length
}
