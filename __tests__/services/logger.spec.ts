import { createLogger } from '@/services/logger'

describe('test services/logger', () => {
  it('should create a logger with the specified types', () => {
    const logger = createLogger('abc', 'bcd')
    expect(logger).toHaveProperty('register')
    expect(typeof logger.register).toBe('function')
  })

  it('should create a logger map with the specified prefixes', () => {
    const logger = createLogger('abc', 'bcd')
    const loggerMap = logger.register('xyz')

    expect(loggerMap).toHaveProperty('abc')
    expect(typeof loggerMap.abc).toBe('object')
    expect(Object.keys(loggerMap.abc)).toEqual(['info', 'fail', 'ok', 'warn'])
    expect(loggerMap).toHaveProperty('bcd')
    expect(typeof loggerMap.bcd).toBe('object')
    expect(Object.keys(loggerMap.bcd)).toEqual(['info', 'fail', 'ok', 'warn'])
  })

  it('should log messages with the specified prefixes', () => {
    const logger = createLogger('abc', 'bcd')
    const { abc, bcd } = logger.register('xyz')
    const spy = jest.spyOn(console, 'log').mockImplementation()

    abc.info('message')
    bcd.fail('message')

    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenCalledWith('[INFO][XYZ][ABC] message')
    expect(spy).toHaveBeenCalledWith('[FAIL][XYZ][BCD] message')
  })
})
