import type { Config } from '@jest/types'

const TIMEOUT = 30e3

export default async (): Promise<Config.InitialOptions> => {
  return {
    skipFilter: true,
    testTimeout: TIMEOUT,
    projects: ['<rootDir>/jest.config.unittest.ts'],
    coverageReporters: ['text', 'cobertura', 'html'],
    collectCoverageFrom: ['<rootDir>/services/**/*.ts', '!<rootDir>/services/**/*.d.ts', '<rootDir>/app/**/*.ts', '!<rootDir>/app/**/*.d.ts'],
  }
}
