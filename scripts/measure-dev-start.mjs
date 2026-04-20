import { spawn } from 'node:child_process'
import { mkdir, open, rm } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')
const viteBin = resolve(rootDir, 'node_modules', 'vite', 'bin', 'vite.js')
const cacheDir = resolve(rootDir, 'node_modules', '.vite')
const logDir = resolve(rootDir, '.vite')
const logPath = resolve(logDir, 'dev-start.log')

const args = process.argv.slice(2)
const coldStart = args.includes('--cold')
const viteArgs = args.filter((arg) => arg !== '--cold')

await mkdir(logDir, { recursive: true })

if (coldStart) {
  await rm(cacheDir, { recursive: true, force: true })
}

const logFile = await open(logPath, 'w')
const logStream = createWriteStream('', { fd: logFile.fd })

const startedAt = Date.now()
let settled = false

function finish(code = 0) {
  if (settled) return
  settled = true
  logStream.end(() => {
    logFile.close().catch(() => {})
    process.exit(code)
  })
}

const child = spawn(process.execPath, [viteBin, '--debug', ...viteArgs], {
  cwd: rootDir,
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe'],
})

child.on('error', (error) => {
  console.error(`[dev:measure] failed to start vite: ${error.message}`)
  finish(1)
})

child.on('exit', (code) => {
  if (!settled) {
    console.error(`[dev:measure] vite exited before ready (code: ${code ?? 'unknown'})`)
    console.error(`[dev:measure] inspect log: ${logPath}`)
    finish(code ?? 1)
  }
})

function handleChunk(chunk) {
  const text = chunk.toString()
  process.stdout.write(text)
  logStream.write(text)

  if (text.includes('ready in')) {
    const elapsedMs = Date.now() - startedAt
    console.log(`\n[dev:measure] elapsed: ${elapsedMs} ms`)
    console.log(`[dev:measure] log: ${logPath}`)
    child.kill('SIGTERM')
    setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGKILL')
      }
    }, 1500).unref()
    finish(0)
  }
}

child.stdout.on('data', handleChunk)
child.stderr.on('data', handleChunk)

process.on('SIGINT', () => {
  child.kill('SIGTERM')
  finish(130)
})
