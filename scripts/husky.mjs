import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { warn, info, fail, ok } from './print.mjs'

const inPlatform = (platform) => platform === process.platform

export const husky = async (options = {}) => {
  const git = path.join(process.cwd(), '.git')
  const isGitRepo = fs.existsSync(git) && (await fs.promises.stat(git)).isDirectory()
  if (!isGitRepo) {
    warn('The project is not a Git repository, skip the Husky installation process.')
    return
  }

  const { upgrade = false, cwd = process.cwd(), compatible = true, skipCi = true } = options
  if (skipCi && process.env.CI) {
    warn('CI/CD environment, skip Husky installation process.')
    return
  }

  const huskyHooksPath = path.join(cwd, '.husky')
  if (upgrade === false && fs.existsSync(huskyHooksPath)) {
    ok('Husky is already installed, skip the Husky installation process.')
    return
  }

  const scripts = [
    inPlatform('win32') ? 'set PATH=\\"%PATH%\\":\\%PATH\\%' : 'export PATH=\\"$PATH\\":\\$PATH',
    ['pre-commit', `pnpm lint-staged`],
    ['commit-msg', `pnpm commitlint --edit \\\$1`],
  ]

  const emptyHookCommands = scripts.reduce((hooks, item) => {
    if (Array.isArray(item)) {
      const [hook] = item
      if (!Array.isArray(hooks[hook])) {
        hooks[hook] = []
      }
    }

    return hooks
  }, {})

  const hookCommands = scripts.reduce((commands, command) => {
    if (typeof command === 'string') {
      Object.keys(commands).forEach((hook) => {
        commands[hook].push(command)
      })
    } else if (Array.isArray(command)) {
      const [hook, script] = command
      commands[hook].push(script)
    }

    return commands
  }, emptyHookCommands)

  const commands = Object.keys(hookCommands).reduce((commands, hook) => {
    const scripts = hookCommands[hook]
    if (Array.isArray(scripts) && scripts.length > 0) {
      commands.push(`husky set .husky/${hook} "${scripts.join('\n')}"`)
    }

    return commands
  }, [])

  if (commands.length > 0) {
    const scripts = ['husky install'].concat(commands).filter(Boolean).join(' && ')
    execSync(scripts, { stdio: 'inherit', cwd })
  }

  try {
    if (compatible === true) {
      const hooksPath = path.join(cwd, '.git/hooks')
      const files = await fs.promises.readdir(huskyHooksPath)
      if (files.length > 0) {
        info(`Compatible with some GUI tools that do not use \`git config core.hooksPath\` as the custom hook path.`)
        for (const filename of files) {
          const huskyFile = path.join(huskyHooksPath, filename)
          const file = path.join(hooksPath, filename)

          const stats = await fs.promises.lstat(huskyFile)
          if (!stats.isFile()) {
            continue
          }

          fs.existsSync(file) && (await fs.promises.unlink(file))
          await fs.promises.copyFile(huskyFile, file)
          info(`${path.relative(cwd, huskyFile)} => ${path.relative(cwd, file)}`)
        }
      }
    }
  } catch (error) {
    await fs.promises.rmdir(huskyHooksPath, { recursive: true })
    fail(error)
    return
  }

  ok(`Husky (Git hook) was installed successfully.`)
}
