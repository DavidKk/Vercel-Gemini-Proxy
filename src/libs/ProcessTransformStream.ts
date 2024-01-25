import { byteToKM } from '@/utils/byteToKM'
import { TransformStream, type Transformer, type QueuingStrategy, type TransformStreamDefaultController } from './TransformStream'

export type TransformFn = (chunk: any) => any

export interface ProcessPayload {
  size: number
  sizeStr: string
  total?: number
  totalStr?: string
  percentage?: number
  percentageStr?: string
  message: string
}

export type ProcessFn = (payload: ProcessPayload) => any

export class ProcessTransformStream<I = any, O = any> extends TransformStream<I, O> {
  protected contentSize: number
  protected transforms: TransformFn[]
  protected processFn: ProcessFn
  protected writtenContents: Uint8Array[]

  public get content() {
    return Buffer.concat(this.writtenContents).toString('utf-8')
  }

  constructor(transformer?: Transformer<I, O>, writableStrategy?: QueuingStrategy<I>, readableStrategy?: QueuingStrategy<O>) {
    const transforms: TransformFn[] = []
    const { transform: inputTransform } = transformer || {}

    const transform = (chunk: any, controller: TransformStreamDefaultController<any>) => {
      this.transforms.forEach((fn) => fn(chunk))
      typeof inputTransform === 'function' ? inputTransform(chunk, controller) : controller.enqueue(chunk)
    }

    super({ ...transformer, transform }, writableStrategy, readableStrategy)

    let size = 0
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
      const sizeStr = byteToKM(size)
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

  public setContentSize(size: number) {
    if (size) {
      this.contentSize = size
    }
  }

  public process(handle: ProcessFn) {
    if (typeof handle !== 'function') {
      return
    }

    this.processFn = handle
  }
}
