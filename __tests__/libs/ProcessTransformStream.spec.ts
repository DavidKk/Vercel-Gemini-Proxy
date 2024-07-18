import { ProcessTransformStream } from '@/libs/ProcessTransformStream'
import { WritableStream } from 'stream/web'

describe('test ProcessTransformStream', () => {
  it('should transform chunks and call the process function with the correct payload', async () => {
    const processFn = jest.fn()
    const transformStream = new ProcessTransformStream()

    transformStream.process(processFn)
    transformStream.setContentSize(100)

    const chunk1 = new Uint8Array([1, 2, 3])
    const chunk2 = new Uint8Array([4, 5, 6])
    const chunk3 = new Uint8Array([7, 8, 9])
    transformStream.readable.pipeTo(new WritableStream())

    const writer = transformStream.writable.getWriter()
    await writer.ready
    await writer.write(chunk1)
    await writer.write(chunk2)
    await writer.write(chunk3)
    await writer.close()

    expect(processFn).toHaveBeenCalledTimes(3)

    expect(processFn).toHaveBeenNthCalledWith(1, {
      size: 3,
      sizeStr: '3 Bytes',
      percentage: 0.03,
      percentageStr: '3.00%',
      message: '3 Bytes of content has been transmitted.(3.00%)',
    })

    expect(processFn).toHaveBeenNthCalledWith(2, {
      size: 6,
      sizeStr: '6 Bytes',
      percentage: 0.06,
      percentageStr: '6.00%',
      message: '6 Bytes of content has been transmitted.(6.00%)',
    })

    expect(processFn).toHaveBeenNthCalledWith(3, {
      size: 9,
      sizeStr: '9 Bytes',
      percentage: 0.09,
      percentageStr: '9.00%',
      message: '9 Bytes of content has been transmitted.(9.00%)',
    })
  })

  it('should ignore non-Uint8Array chunks', async () => {
    const processFn = jest.fn()
    const transformStream = new ProcessTransformStream()

    transformStream.process(processFn)
    transformStream.setContentSize(100)

    const chunk1 = new Uint8Array([1, 2, 3])
    const chunk2 = 'hello'
    const chunk3 = { foo: 'bar' }
    transformStream.readable.pipeTo(new WritableStream())

    const writer = transformStream.writable.getWriter()
    await writer.ready
    await writer.write(chunk1)
    await writer.write(chunk2)
    await writer.write(chunk3)
    await writer.close()

    expect(processFn).toHaveBeenCalledTimes(1)
    expect(processFn).toHaveBeenCalledWith({
      size: 3,
      sizeStr: '3 Bytes',
      percentage: 0.03,
      percentageStr: '3.00%',
      message: '3 Bytes of content has been transmitted.(3.00%)',
    })
  })

  it('should not call the process function if it is not set', async () => {
    const transformStream = new ProcessTransformStream()
    transformStream.setContentSize(100)

    const chunk1 = new Uint8Array([1, 2, 3])
    const chunk2 = new Uint8Array([4, 5, 6])
    const chunk3 = new Uint8Array([7, 8, 9])

    transformStream.readable.pipeTo(new WritableStream())

    const writer = transformStream.writable.getWriter()
    await writer.ready
    await writer.write(chunk1)
    await writer.write(chunk2)
    await writer.write(chunk3)
    await writer.close()

    expect(transformStream['processFn']).toBeUndefined()
  })
})
