export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        // Define your global variables here
        // For example, to include ES6 and Node globals:
        Promise: 'readonly',
        require: 'readonly',
        module: 'readonly',
        process: 'readonly',
        // Add other globals as needed
      },
    },
  },
]
