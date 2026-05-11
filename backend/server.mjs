import http from 'node:http'
import {
  ApiError,
  confirmAllocationRun,
  getAllocationRun,
  getCurrentShift,
  getCurrentUser,
  getHandoffSheet,
  getNurseOverview,
  getWarRoom,
  listAdmissions,
  listBurdenAssessments,
  listNurses,
  listTasks,
  suggestAllocationRun,
  updateAllocationItems,
  updateBurdenAssessment,
  updateTask,
} from './src/pgRepository.mjs'

const port = Number(process.env.PORT ?? 8787)
const host = process.env.HOST ?? '127.0.0.1'

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    sendError(res, error)
  })
})

server.listen(port, host, () => {
  console.log(`API listening on http://${host}:${port}`)
})

async function handleRequest(req, res) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `${host}:${port}`}`)

  setCorsHeaders(res)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (!['GET', 'POST', 'PUT', 'PATCH'].includes(req.method)) {
    throw new ApiError(405, 'METHOD_NOT_ALLOWED', '此 endpoint 不支援這個 HTTP method', {
      method: req.method,
    })
  }

  if (url.pathname === '/' || url.pathname === '/api/v1') {
    sendJson(res, {
      data: {
        name: 'ICU Nursing Allocation API',
        baseUrl: '/api/v1',
        endpoints: [
          'GET /api/v1/health',
          'GET /api/v1/me',
          'GET /api/v1/shifts/current',
          'GET /api/v1/nurses?shiftId={shiftId}',
          'GET /api/v1/admissions?shiftId={shiftId}&status=active',
          'GET /api/v1/nurse/overview?shiftId={shiftId}',
          'GET /api/v1/burden-assessments?shiftId={shiftId}&scope=mine',
          'PATCH /api/v1/burden-assessments/{assessmentId}',
          'GET /api/v1/tasks?shiftId={shiftId}&assignee=me&status=pending&kind=給藥',
          'PATCH /api/v1/tasks/{taskId}',
          'POST /api/v1/allocation-runs/suggest',
          'GET /api/v1/allocation-runs/{allocationRunId}',
          'PUT /api/v1/allocation-runs/{allocationRunId}/items',
          'POST /api/v1/allocation-runs/{allocationRunId}/confirm',
          'GET /api/v1/war-room?shiftId={shiftId}',
          'GET /api/v1/handoff-sheets?shiftId={shiftId}',
        ],
      },
    })
    return
  }

  if (url.pathname === '/api/v1/health') {
    assertMethod(req, 'GET')
    sendJson(res, { data: { ok: true } })
    return
  }

  if (url.pathname === '/api/v1/me') {
    assertMethod(req, 'GET')
    const userId = getUserId(req, url)
    sendJson(res, { data: await getCurrentUser(userId) })
    return
  }

  if (url.pathname === '/api/v1/shifts/current') {
    assertMethod(req, 'GET')
    sendJson(res, { data: await getCurrentShift(url.searchParams.get('unitName') ?? 'ICU') })
    return
  }

  if (url.pathname === '/api/v1/nurses') {
    assertMethod(req, 'GET')
    sendJson(res, { data: await listNurses({ shiftId: nullable(url.searchParams.get('shiftId')) }) })
    return
  }

  if (url.pathname === '/api/v1/admissions') {
    assertMethod(req, 'GET')
    sendJson(res, {
      data: await listAdmissions({
        shiftId: nullable(url.searchParams.get('shiftId')),
        status: url.searchParams.get('status') ?? 'active',
      }),
    })
    return
  }

  if (url.pathname === '/api/v1/nurse/overview') {
    assertMethod(req, 'GET')
    sendJson(res, {
      data: await getNurseOverview({
        shiftId: url.searchParams.get('shiftId') ?? undefined,
        userId: getUserId(req, url),
      }),
    })
    return
  }

  if (url.pathname === '/api/v1/burden-assessments') {
    assertMethod(req, 'GET')
    sendJson(res, {
      data: await listBurdenAssessments({
        shiftId: url.searchParams.get('shiftId') ?? undefined,
        scope: url.searchParams.get('scope') ?? 'all',
        userId: getUserId(req, url),
      }),
    })
    return
  }

  const burdenMatch = url.pathname.match(/^\/api\/v1\/burden-assessments\/([^/]+)$/)
  if (burdenMatch) {
    assertMethod(req, 'PATCH')
    sendJson(res, {
      data: await updateBurdenAssessment({
        assessmentId: decodeURIComponent(burdenMatch[1]),
        patch: await readJsonBody(req),
        userId: getUserId(req, url),
      }),
    })
    return
  }

  if (url.pathname === '/api/v1/tasks') {
    assertMethod(req, 'GET')
    const result = await listTasks({
      shiftId: url.searchParams.get('shiftId') ?? undefined,
      assignee: url.searchParams.get('assignee') ?? 'me',
      status: nullable(url.searchParams.get('status')),
      kind: nullable(url.searchParams.get('kind')),
      userId: getUserId(req, url),
    })
    sendJson(res, result)
    return
  }

  const taskMatch = url.pathname.match(/^\/api\/v1\/tasks\/([^/]+)$/)
  if (taskMatch) {
    assertMethod(req, 'PATCH')
    sendJson(res, {
      data: await updateTask({
        taskId: decodeURIComponent(taskMatch[1]),
        patch: await readJsonBody(req),
        userId: getUserId(req, url),
      }),
    })
    return
  }

  if (url.pathname === '/api/v1/allocation-runs/suggest') {
    assertMethod(req, 'POST')
    const body = await readJsonBody(req)
    sendJson(res, {
      data: await suggestAllocationRun({
        shiftId: body.shiftId,
        targetShiftId: body.targetShiftId,
        userId: getUserId(req, url) ?? body.createdBy,
      }),
    }, 201)
    return
  }

  const allocationGetMatch = url.pathname.match(/^\/api\/v1\/allocation-runs\/([^/]+)$/)
  if (allocationGetMatch) {
    assertMethod(req, 'GET')
    sendJson(res, {
      data: await getAllocationRun({
        allocationRunId: decodeURIComponent(allocationGetMatch[1]),
      }),
    })
    return
  }

  const allocationItemsMatch = url.pathname.match(/^\/api\/v1\/allocation-runs\/([^/]+)\/items$/)
  if (allocationItemsMatch) {
    assertMethod(req, 'PUT')
    const body = await readJsonBody(req)
    sendJson(res, {
      data: await updateAllocationItems({
        allocationRunId: decodeURIComponent(allocationItemsMatch[1]),
        items: body.items,
        userId: getUserId(req, url),
      }),
    })
    return
  }

  const allocationConfirmMatch = url.pathname.match(/^\/api\/v1\/allocation-runs\/([^/]+)\/confirm$/)
  if (allocationConfirmMatch) {
    assertMethod(req, 'POST')
    const body = await readJsonBody(req)
    sendJson(res, {
      data: await confirmAllocationRun({
        allocationRunId: decodeURIComponent(allocationConfirmMatch[1]),
        userId: getUserId(req, url) ?? body.confirmedBy,
      }),
    })
    return
  }

  if (url.pathname === '/api/v1/war-room') {
    assertMethod(req, 'GET')
    sendJson(res, { data: await getWarRoom({ shiftId: url.searchParams.get('shiftId') }) })
    return
  }

  if (url.pathname === '/api/v1/handoff-sheets') {
    assertMethod(req, 'GET')
    sendJson(res, { data: await getHandoffSheet({ shiftId: url.searchParams.get('shiftId') }) })
    return
  }

  throw new ApiError(404, 'NOT_FOUND', '找不到 API endpoint', { path: url.pathname })
}

function assertMethod(req, method) {
  if (req.method !== method) {
    throw new ApiError(405, 'METHOD_NOT_ALLOWED', '此 endpoint 不支援這個 HTTP method', {
      method: req.method,
      expected: method,
    })
  }
}

async function readJsonBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8').trim()
  if (!raw) return {}

  try {
    return JSON.parse(raw)
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'JSON body 格式不合法')
  }
}

function getUserId(req, url) {
  return req.headers['x-user-id']?.toString() || url.searchParams.get('userId') || undefined
}

function nullable(value) {
  return value && value.trim().length > 0 ? value : undefined
}

function sendJson(res, payload, status = 200) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(payload, null, 2))
}

function sendError(res, error) {
  const status = error instanceof ApiError ? error.status : 500
  const code = error instanceof ApiError ? error.code : 'INTERNAL_SERVER_ERROR'
  const message = error instanceof Error ? error.message : '伺服器發生未知錯誤'
  const details = error instanceof ApiError ? error.details : {}

  sendJson(res, { error: { code, message, details } }, status)
}

function setCorsHeaders(res) {
  res.setHeader('access-control-allow-origin', '*')
  res.setHeader('access-control-allow-methods', 'GET, POST, PUT, PATCH, OPTIONS')
  res.setHeader('access-control-allow-headers', 'content-type, x-user-id')
}
