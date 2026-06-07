import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'

const port = 18787
const baseUrl = `http://127.0.0.1:${port}/api/v1`

let server: ChildProcessWithoutNullStreams
let serverStderr = ''

async function waitForHealth() {
  const deadline = Date.now() + 5000
  let lastError: unknown

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`API server exited before health check passed: ${serverStderr}`)
    }

    try {
      const response = await fetch(`${baseUrl}/health`)
      if (response.ok) return
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw lastError ?? new Error('API health endpoint did not become ready')
}

describe('API health integration', () => {
  beforeAll(async () => {
    server = spawn('node', ['backend/server.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(port),
        HOST: '127.0.0.1',
      },
    })

    serverStderr = ''
    server.stderr.on('data', (chunk) => {
      serverStderr += String(chunk)
    })

    await waitForHealth()
  })

  afterAll(() => {
    if (!server.killed) server.kill()
  })

  it('returns the standard JSON health response', async () => {
    const response = await fetch(`${baseUrl}/health`)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: {
        ok: true,
      },
    })
  })
})
