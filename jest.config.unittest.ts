import { pathsToModuleNameMapper } from 'ts-jest'
import type { Config } from '@jest/types'
import { parseTSConfig } from './jest/parseTSConfig'

const { options: compilerOptions } = parseTSConfig('tsconfig.jest.json')
const { paths: tsconfigPaths } = compilerOptions

export default async (): Promise<Config.InitialOptions> => {
  return {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['<rootDir>/__tests__/**/*.spec.ts'],
    modulePathIgnorePatterns: ['<rootDir>/.*/__mocks__'],
    moduleNameMapper: {
      ...(!tsconfigPaths
        ? {}
        : pathsToModuleNameMapper(tsconfigPaths, {
            prefix: '<rootDir>',
          })),
    },
  }
}
