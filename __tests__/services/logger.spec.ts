import { createLogger } from '@/services/logger'

describe('test services/logger', () => {
  it('should create a module logger with info/ok/warn/fail', () => {
    const logger = createLogger('api-gemini')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.ok).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.fail).toBe('function')
  })

  it('should log messages with module prefix', () => {
    const logger = createLogger('api-gemini')
    const spy = jest.spyOn(console, 'log').mockImplementation()

    logger.info('message')
    logger.ok('done')

    expect(spy).toHaveBeenCalledWith('[info][api-gemini]', 'message')
    expect(spy).toHaveBeenCalledWith('[ok][api-gemini]', 'done')
    spy.mockRestore()
  })
})
