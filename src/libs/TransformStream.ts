import { TransformStream as WebTransformStream, WritableStream as WebWritableStream, ReadableStream as WebReadableStream } from 'stream/web'
import type { Transformer, QueuingStrategy, TransformStreamDefaultController } from 'stream/web'

declare class TransformStream<I = any, O = any> extends WebTransformStream<I, O> {}
declare class WritableStream<W = any> extends WebWritableStream<W> {}
declare class ReadableStream<R = any> extends WebReadableStream<R> {}

const ExchangeTransformStream = TransformStream
const ExchangeWritableStream = WritableStream
const ExchangeReadableStream = ReadableStream

export { ExchangeTransformStream as TransformStream, ExchangeWritableStream as WritableStream, ExchangeReadableStream as ReadableStream }

export type { WebTransformStream, WebWritableStream, WebReadableStream, Transformer, QueuingStrategy, TransformStreamDefaultController }
