import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

import { fail, info, ok, warn } from './print.mjs'

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

  // Husky v9+ 使用新的方式：直接创建 hook 文件
  // 首先初始化 husky（使用 husky install 或 husky init）
  try {
    // 尝试使用 husky init（v9+ 推荐方式）
    execSync('husky init', { stdio: 'pipe', cwd })
  } catch (error) {
    // 如果 husky init 失败，尝试 husky install
    try {
      execSync('husky install', { stdio: 'pipe', cwd })
    } catch (installError) {
      // 如果都失败，手动创建 .husky 目录
      if (!fs.existsSync(huskyHooksPath)) {
        await fs.promises.mkdir(huskyHooksPath, { recursive: true })
      }
      // 创建 _/husky.sh 文件（husky 需要的辅助脚本）
      const huskyShPath = path.join(huskyHooksPath, '_', 'husky.sh')
      const huskyShDir = path.dirname(huskyShPath)
      if (!fs.existsSync(huskyShDir)) {
        await fs.promises.mkdir(huskyShDir, { recursive: true })
      }
      if (!fs.existsSync(huskyShPath)) {
        await fs.promises.writeFile(
          huskyShPath,
          `#!/usr/bin/env sh
if [ -z "$husky_skip_init" ]; then
  debug () {
    if [ "$HUSKY_DEBUG" = "1" ]; then
      echo "husky (debug) - $1"
    fi
  }

  readonly hook_name="$(basename -- "$0")"
  debug "starting $hook_name..."

  if [ "$HUSKY" = "0" ]; then
    debug "HUSKY env variable is set to 0, skipping hook"
    exit 0
  fi

  if [ -f ~/.huskyrc ]; then
    debug "sourcing ~/.huskyrc"
    . ~/.huskyrc
  fi

  readonly husky_skip_init=1
  export husky_skip_init
  sh -e "$0" "$@"
  exitcode="$?"

  if [ $exitcode != 0 ]; then
    echo "husky - $hook_name hook exited with code $exitcode (error)"
  fi

  if [ $exitcode = 127 ]; then
    echo "husky - command not found in PATH=$PATH"
  fi

  exit $exitcode
fi
`,
          { mode: 0o755 }
        )
      }
    }
  }

  // 根据平台生成不同的 hook 内容
  // Windows 下 Git GUI 可能 PATH 不完整，需要确保能找到 pnpm
  const isWindows = inPlatform('win32')

  // Windows 下使用 Git Bash，需要确保 PATH 包含系统 PATH
  // Unix 系统也需要确保 PATH 正确（Git GUI 可能 PATH 不完整）
  // 这个设置是为了解决 Git GUI 工具（如 SourceTree, GitHub Desktop 等）运行时 PATH 不完整的问题
  const pathSetup = isWindows
    ? `# Windows Git GUI 环境变量可能不完整，需要手动设置 PATH
# 确保包含系统 PATH（Git GUI 可能只提供最小 PATH）
export PATH="$PATH":$PATH
# Windows 下 pnpm 的常见安装位置
if [ -n "$USERPROFILE" ] && [ -d "$USERPROFILE/AppData/Local/pnpm" ]; then
  export PATH="$USERPROFILE/AppData/Local/pnpm:$PATH"
fi
if [ -n "$HOME" ] && [ -d "$HOME/AppData/Local/pnpm" ]; then
  export PATH="$HOME/AppData/Local/pnpm:$PATH"
fi
# 尝试从 npm 全局路径找到 pnpm
if command -v npm >/dev/null 2>&1; then
  npm_prefix=$(npm config get prefix 2>/dev/null)
  if [ -n "$npm_prefix" ] && [ -d "$npm_prefix" ]; then
    export PATH="$npm_prefix:$PATH"
  fi
fi`
    : `# Git GUI 环境变量可能不完整，需要手动设置 PATH
# 确保包含系统 PATH（Git GUI 可能只提供最小 PATH）
export PATH="$PATH":$PATH
# Unix 系统下 pnpm 的常见安装位置
if [ -d "$HOME/.local/share/pnpm" ]; then
  export PATH="$HOME/.local/share/pnpm:$PATH"
fi
if [ -d "$HOME/.pnpm" ]; then
  export PATH="$HOME/.pnpm:$PATH"
fi
# 尝试从 npm 全局路径找到 pnpm
if command -v npm >/dev/null 2>&1; then
  npm_prefix=$(npm config get prefix 2>/dev/null)
  if [ -n "$npm_prefix" ] && [ -d "$npm_prefix" ]; then
    export PATH="$npm_prefix:$PATH"
  fi
fi`

  // 定义 hooks 配置
  const hooks = [
    {
      name: 'pre-commit',
      content: `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

${pathSetup}

pnpm lint-staged
`,
    },
    {
      name: 'commit-msg',
      content: `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

${pathSetup}

pnpm commitlint --edit "$1"
`,
    },
  ]

  // 创建 hook 文件
  for (const hook of hooks) {
    const hookPath = path.join(huskyHooksPath, hook.name)

    // 确保 .husky 目录存在
    if (!fs.existsSync(huskyHooksPath)) {
      await fs.promises.mkdir(huskyHooksPath, { recursive: true })
    }

    // 写入 hook 文件
    await fs.promises.writeFile(hookPath, hook.content, { mode: 0o755 })
    info(`Created ${path.relative(cwd, hookPath)}`)
  }

  try {
    if (compatible === true) {
      const hooksPath = path.join(cwd, '.git/hooks')
      if (!fs.existsSync(hooksPath)) {
        await fs.promises.mkdir(hooksPath, { recursive: true })
      }
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
