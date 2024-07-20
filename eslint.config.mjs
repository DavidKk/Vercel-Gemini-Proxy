import importPlugin from 'eslint-plugin-import'
import prettierPlugin from 'eslint-plugin-prettier'
import tsConfig from './eslintrc/ts.mjs'
import cjsConfig from './eslintrc/cjs.mjs'
import esmConfig from './eslintrc/esm.mjs'

export default [
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
          devDependencies: ['**/*.spec.ts', '**/*/jest.config.*.ts', 'eslintrc/**/*.mjs', 'scripts/**/*.mjs', 'jest/**/*.ts', '.cz-config.js', '**/eslint.config.mjs'],
        },
      ],
    },
    ignores: ['.next/**/*', '.husky/**/*', 'coverage/**/*', 'node_modules'],
  },
  ...tsConfig,
  ...cjsConfig,
  ...esmConfig,
]
