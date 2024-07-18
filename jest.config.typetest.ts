import type { Config } from '@jest/types'
import fs from 'fs'
import path from 'path'
import JSON5 from 'json5'
import type { CompilerOptions } from 'typescript'
import { pathsToModuleNameMapper } from 'ts-jest'

const tsconfigFile = path.join(__dirname, './tsconfig.json')
const tsconfigContent = fs.readFileSync(tsconfigFile, 'utf-8')
const { compilerOptions } = JSON5.parse<{ compilerOptions: CompilerOptions }>(tsconfigContent)
const tsconfigPaths = compilerOptions.paths!

export default (): Config.InitialOptions => ({
  preset: 'ts-jest',
  runner: 'jest-runner-tsd',
  testMatch: ['<rootDir>/__typetests__/**/*.spec.ts'],
  moduleNameMapper: {
    ...pathsToModuleNameMapper(tsconfigPaths, {
      prefix: '<rootDir>',
    }),
  },
})
