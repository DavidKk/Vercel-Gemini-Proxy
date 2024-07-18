import { stringifyBytes } from '@/utils/stringifyBytes'
import { TransformStream, type Transformer, type QueuingStrategy, type TransformStreamDefaultController } from './TransformStream'

// Define the type for the transform function
export type TransformFn = (chunk: any) => any

// Define the interface for the process payload
export interface ProcessPayload {
  size: number // Current size of the processed data
  sizeStr: string // Human-readable string of the current size
  total?: number // Total size of the data (if known)
  totalStr?: string // Human-readable string of the total size
  percentage?: number // Percentage of the processed data (if total size is known)
  percentageStr?: string // Human-readable string of the percentage
  message: string // Message describing the current processing status
}

// Define the type for the process function
export type ProcessFn = (payload: ProcessPayload) => any

// Class extending TransformStream to include processing capabilities
export class ProcessTransformStream<I = any, O = any> extends TransformStream<I, O> {
  protected contentSize: number // Total size of the content to be processed
  protected transforms: TransformFn[] // Array of transform functions to apply to each chunk
  protected processFn: ProcessFn // Function to handle process updates
  protected writtenContents: Uint8Array[] // Array to store the written contents

  // Getter to retrieve the concatenated content as a string
  public get content() {
    return Buffer.concat(this.writtenContents).toString('utf-8')
  }

  // Constructor to initialize the TransformStream with optional transformer and queuing strategies
  constructor(transformer?: Transformer<I, O>, writableStrategy?: QueuingStrategy<I>, readableStrategy?: QueuingStrategy<O>) {
    const transforms: TransformFn[] = []
    const { transform: inputTransform } = transformer || {}

    // Define the transform function to be used by the TransformStream
    const transform = (chunk: any, controller: TransformStreamDefaultController<any>) => {
      this.transforms.forEach((fn) => fn(chunk))
      typeof inputTransform === 'function' ? inputTransform(chunk, controller) : controller.enqueue(chunk)
    }

    super({ ...transformer, transform }, writableStrategy, readableStrategy)

    let size = 0
    // Define the process transform function to handle process updates
    const processTransform = (chunk: any) => {
      if (typeof this.processFn !== 'function') {
        return
      }

      if (!(chunk instanceof Uint8Array)) {
        return
      }

      size += chunk.byteLength
      this.writtenContents.push(chunk)

      const totalSize = this.contentSize
      const sizeStr = stringifyBytes(size)
      const percentage = totalSize ? size / totalSize : undefined
      const percentageStr = percentage ? `${(percentage * 100).toFixed(2)}%` : ''
      const message = `${sizeStr} of content has been transmitted.${percentageStr ? `(${percentageStr})` : ''}`
      this.processFn({ size, sizeStr, percentage, percentageStr, message })
    }

    this.writtenContents = []
    this.contentSize = 0
    this.transforms = transforms
    this.transforms.push(processTransform)
  }

  // Method to set the total content size
  public setContentSize(size: number) {
    if (size) {
      this.contentSize = size
    }
  }

  // Method to set the process function
  public process(handle: ProcessFn) {
    if (typeof handle !== 'function') {
      return
    }

    this.processFn = handle
  }
}
