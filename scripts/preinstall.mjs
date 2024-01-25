if (!process.env.npm_execpath.match(/pnpm/)) {
  throw new Error('\x1b[31mPlease use pnpm@8.x to install. @see https://pnpm.io/pnpm-cli\x1b[0m')
}
