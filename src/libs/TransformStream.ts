// Import the TransformStream, WritableStream, and ReadableStream classes from the 'stream/web' module
import { TransformStream as WebTransformStream, WritableStream as WebWritableStream, ReadableStream as WebReadableStream } from 'stream/web'
// Import the type definitions for Transformer, QueuingStrategy, and TransformStreamDefaultController from 'stream/web'
import type { Transformer, QueuingStrategy, TransformStreamDefaultController } from 'stream/web'

// Declare a new class TransformStream that extends the imported WebTransformStream
// The generic parameters I and O represent the input and output types, respectively
declare class TransformStream<I = any, O = any> extends WebTransformStream<I, O> {}

// Declare a new class WritableStream that extends the imported WebWritableStream
// The generic parameter W represents the type of data that can be written to the stream
declare class WritableStream<W = any> extends WebWritableStream<W> {}

// Declare a new class ReadableStream that extends the imported WebReadableStream
// The generic parameter R represents the type of data that can be read from the stream
declare class ReadableStream<R = any> extends WebReadableStream<R> {}

// Assign the declared TransformStream class to a new constant ExchangeTransformStream
const ExchangeTransformStream = TransformStream
// Assign the declared WritableStream class to a new constant ExchangeWritableStream
const ExchangeWritableStream = WritableStream
// Assign the declared ReadableStream class to a new constant ExchangeReadableStream
const ExchangeReadableStream = ReadableStream

// Export the ExchangeTransformStream as TransformStream, ExchangeWritableStream as WritableStream, and ExchangeReadableStream as ReadableStream
export { ExchangeTransformStream as TransformStream, ExchangeWritableStream as WritableStream, ExchangeReadableStream as ReadableStream }
// Export the type definitions for WebTransformStream, WebWritableStream, WebReadableStream, Transformer, QueuingStrategy, and TransformStreamDefaultController
export type { WebTransformStream, WebWritableStream, WebReadableStream, Transformer, QueuingStrategy, TransformStreamDefaultController }
