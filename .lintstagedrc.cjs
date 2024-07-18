module.exports = {
  '**/*.{js,jsx,ts,tsx,d.tsx,md,yml,yaml,json,css,less,scss,sass,html,ejs,mjs}': (files) => {
    return ['prettier', '--config .prettierrc.js', '--write', ...files].join(' ')
  },
  '**/*.{ts,tsx,d.ts,mjs}': async (files) => {
    return ['eslint', '--config eslint.config.mjs', '--max-warnings 0', ...files].join(' ')
  },
}
