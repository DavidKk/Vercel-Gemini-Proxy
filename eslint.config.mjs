import importPlugin from 'eslint-plugin-import'
import prettierPlugin from 'eslint-plugin-prettier'
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort'

import cjsConfig from './eslintrc/cjs.mjs'
import esmConfig from './eslintrc/esm.mjs'
import tsConfig from './eslintrc/ts.mjs'

export default [
  {
    ignores: ['.next/**/*', '.husky/**/*', 'coverage/**/*', 'node_modules', 'test-results/**/*', 'playwright-report/**/*', 'blob-report/**/*'],
  },
  {
    languageOptions: {
      globals: {
        process: 'readonly',
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        exports: 'readonly',
      },
    },
    plugins: {
      'eslint-plugin-import': importPlugin,
      'eslint-plugin-prettier': prettierPlugin,
      'eslint-plugin-simple-import-sort': simpleImportSortPlugin,
    },
    rules: {
      'max-len': [
        'error',
        {
          code: 180,
          tabWidth: 2,
          ignoreTemplateLiterals: true,
          ignoreUrls: true,
          ignoreStrings: true,
        },
      ],
      semi: ['error', 'never'],
      'no-console': 'warn',
      'eslint-plugin-import/no-duplicates': 'warn',
      'eslint-plugin-import/no-extraneous-dependencies': [
        'warn',
        {
          devDependencies: [
            '**/*.spec.ts',
            '**/*.test.ts',
            '**/*/jest.config.*.ts',
            'eslintrc/**/*.mjs',
            'scripts/**/*.mjs',
            'jest/**/*.ts',
            '.cz-config.js',
            '**/eslint.config.mjs',
            '**/playwright.config.ts',
            '**/playwright-tsconfig.json',
            '**/__webtests__/**/*.ts',
          ],
        },
      ],
      'eslint-plugin-simple-import-sort/exports': 'error',
      'eslint-plugin-simple-import-sort/imports': 'error',
    },
  },
  ...tsConfig,
  ...cjsConfig,
  ...esmConfig,
]
