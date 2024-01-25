import chalk from 'chalk'
import PrettyError from 'pretty-error'

const isVerbose = -1 !== process.argv.indexOf('--verbose')

export const pretty = (info, options = {}) => {
  const { prefix, verbose = false } = options
  const reason = info instanceof Error ? info : new Error(info)
  const pe = new PrettyError()
  const prettyMessage = pe.render(reason)
  const message = `${reason.message}${verbose === true ? `\n${prettyMessage}` : ''}`
  return { message: prefix ? `${prefix} ${message}` : message, reason, prettyMessage }
}

export const register =
  (color, defaultOptions = {}) =>
  (info, options = {}) => {
    const { prefix, onlyShowInVerbose = false, verbose: inVerbose = false } = defaultOptions
    const { verbose = isVerbose || inVerbose, ...restOptions } = options
    const { message, reason, prettyMessage } = pretty(info, { ...restOptions, verbose })
    const content = prefix ? `${prefix} ${message}` : message
    const logs = typeof chalk[color] === 'function' ? chalk[color](content) : content

    if (!(onlyShowInVerbose && !verbose)) {
      // eslint-disable-next-line no-console
      console.log(logs)
    }

    return { message, reason, prettyMessage }
  }

export const ok = register('greenBright', { prefix: '✨' })
export const info = register('cyanBright')
export const warn = register('yellowBright', { prefix: '⚠️' })
export const fail = register('redBright', { prefix: '✗' })
