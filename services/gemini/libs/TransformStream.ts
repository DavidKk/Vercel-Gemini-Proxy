export type { QueuingStrategy, Transformer, TransformStreamDefaultController } from 'stream/web'

/**
 * Prefer global Web Streams (Node 18+ / DOM) so Response and body types align.
 * Fall back aliases keep imports stable for ProcessTransformStream.
 */
export const TransformStream = globalThis.TransformStream
export const WritableStream = globalThis.WritableStream
export const ReadableStream = globalThis.ReadableStream

export type WebReadableStream = globalThis.ReadableStream
export type WebWritableStream = globalThis.WritableStream
export type WebTransformStream = globalThis.TransformStream
