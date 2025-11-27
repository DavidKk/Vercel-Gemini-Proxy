import { exec } from 'child_process'
import Spinnies from 'spinnies'

import { husky } from './husky.mjs'

const spinnies = new Spinnies()

const tasks = {
  'Applies a patch to the TypeScript compiler.': 'ts-patch install -s',
  'Install git hook husky to project.': () => husky({ compatible: true }),
}

const executeCommand = async (command) => {
  if (typeof command === 'function') {
    return command()
  }

  await new Promise((resolve, reject) => {
    const cp = exec(command, {
      env: {
        ...process.env,
        FORCE_COLOR: 'true',
      },
    })

    cp.stdout.pipe(process.stdout)
    cp.stderr.pipe(process.stderr)
    cp.on('exit', (code) => (code ? reject(code) : resolve()))
  })
}

async function main() {
  for (const [text, command] of Object.entries(tasks)) {
    spinnies.add(text, { text })
    await executeCommand(command)
    spinnies.succeed(text)
  }
}

main()
