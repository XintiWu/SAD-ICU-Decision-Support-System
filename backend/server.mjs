import http from 'node:http'
import { runMigrations } from './src/db.mjs'
import {
  ApiError,
  confirmAllocationRun,
  revertAllocationRunToDraft,
  getAllocationRun,
  getLatestAllocationRun,
  getCurrentShift,
  listShifts,
  getCurrentUser,
  getHandoffSheet,
  getHandoffSnapshot,
  getNurseOverview,
  getWarRoom,
  listAdmissions,
  listBurdenAssessments,
  listHandoffSnapshots,
  listNurses,
  listStatOrders,
  listTasks,
  suggestAllocationRun,
  updateAllocationItems,
  updateBurdenAssessment,
  updateStatOrder,
  createStatOrder,
  importDemoStatOrders,
  updateTask,
  importRoster,
  resetDatabaseToDemo,
} from './src/runtimeRepository.mjs'

const port = Number(process.env.PORT ?? 8787)
const host = process.env.HOST ?? '127.0.0.1'

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    sendError(res, error)
  })
})

runMigrations().catch((err) => console.warn('migration warning:', err.message))

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
          'GET /api/v1/shifts',
          'GET /api/v1/shifts/current',
          'GET /api/v1/nurses?shiftId={shiftId}',
          'GET /api/v1/stat-orders?shiftId={shiftId}',
          'POST /api/v1/stat-orders',
          'PATCH /api/v1/stat-orders/{orderId}',
          'GET /api/v1/admissions?shiftId={shiftId}&status=active',
          'GET /api/v1/nurse/overview?shiftId={shiftId}',
          'GET /api/v1/burden-assessments?shiftId={shiftId}&scope=mine',
          'PATCH /api/v1/burden-assessments/{assessmentId}',
          'GET /api/v1/tasks?shiftId={shiftId}&assignee=me&status=pending&kind=給藥',
          'PATCH /api/v1/tasks/{taskId}',
          'GET /api/v1/allocation-runs/current?shiftId={shiftId}',
          'POST /api/v1/allocation-runs/suggest',
          'GET /api/v1/allocation-runs/{allocationRunId}',
          'PUT /api/v1/allocation-runs/{allocationRunId}/items',
          'POST /api/v1/allocation-runs/{allocationRunId}/confirm',
          'GET /api/v1/war-room?shiftId={shiftId}',
          'GET /api/v1/handoff-sheets?shiftId={shiftId}',
          'GET /api/v1/handoff-snapshots',
          'GET /api/v1/handoff-snapshots/{snapshotId}',
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

  if (url.pathname === '/api/v1/shifts') {
    assertMethod(req, 'GET')
    sendJson(res, { data: await listShifts({ unitName: url.searchParams.get('unitName') ?? 'ICU' }) })
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

  if (url.pathname === '/api/v1/stat-orders') {
    if (req.method === 'POST') {
      const body = await readJsonBody(req)
      const shiftId = body.shiftId || url.searchParams.get('shiftId')
      if (!shiftId) throw new ApiError(400, 'MISSING_PARAM', 'shiftId required')
      sendJson(res, {
        data: await createStatOrder({
          shiftId,
          admissionId: body.admissionId,
          title: body.title,
          kind: body.kind,
          orderedBy: body.orderedBy,
          reason: body.reason,
          severity: body.severity,
          userId: getUserId(req, url),
        }),
      }, 201)
      return
    }

    assertMethod(req, 'GET')
    const shiftId = url.searchParams.get('shiftId')
    if (!shiftId) throw new ApiError(400, 'MISSING_PARAM', 'shiftId required')
    sendJson(res, {
      data: await listStatOrders({
        shiftId,
        assignee: url.searchParams.get('assignee') ?? 'all',
        includeCompleted: url.searchParams.get('includeCompleted') === 'true',
        userId: getUserId(req, url),
      }),
    })
    return
  }

  if (url.pathname === '/api/v1/stat-orders/import') {
    assertMethod(req, 'POST')
    const body = await readJsonBody(req)
    const shiftId = body.shiftId
    if (!shiftId) throw new ApiError(400, 'MISSING_PARAM', 'shiftId required')
    sendJson(res, {
      data: await importDemoStatOrders({ shiftId }),
    }, 201)
    return
  }

  if (url.pathname === '/api/v1/roster/import') {
    assertMethod(req, 'POST')
    const body = await readJsonBody(req)
    const { startDate, schedule } = body
    if (!startDate) throw new ApiError(400, 'MISSING_PARAM', 'startDate 為必填')
    if (!schedule || !Array.isArray(schedule)) throw new ApiError(400, 'MISSING_PARAM', 'schedule 格式不合法')
    sendJson(res, {
      data: await importRoster({ startDate, schedule }),
    }, 201)
    return
  }

  if (url.pathname === '/api/v1/roster/reset') {
    assertMethod(req, 'POST')
    await resetDatabaseToDemo()
    sendJson(res, {
      message: 'Database reset to default demo state successfully',
    }, 200)
    return
  }

  const statOrderMatch = url.pathname.match(/^\/api\/v1\/stat-orders\/([^/]+)$/)
  if (statOrderMatch) {
    assertMethod(req, 'PATCH')
    sendJson(res, {
      data: await updateStatOrder({
        orderId: decodeURIComponent(statOrderMatch[1]),
        patch: await readJsonBody(req),
        userId: getUserId(req, url),
      }),
    })
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
      urgent: nullable(url.searchParams.get('urgent')),
      admissionId: nullable(url.searchParams.get('admissionId')),
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

  if (url.pathname === '/api/v1/allocation-runs/current') {
    assertMethod(req, 'GET')
    sendJson(res, {
      data: await getLatestAllocationRun({ shiftId: nullable(url.searchParams.get('shiftId')) }),
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
        dryRun: body.dryRun === true,
      }),
    }, 201)
    return
  }

  const allocationGetMatch = url.pathname.match(/^\/api\/v1\/allocation-runs\/([^/]+)$/)
  if (allocationGetMatch) {
    assertMethod(req, 'GET')
    const allocationRunId = decodeURIComponent(allocationGetMatch[1])
    if (allocationRunId === 'current') {
      sendJson(res, {
        data: await getLatestAllocationRun({ shiftId: nullable(url.searchParams.get('shiftId')) }),
      })
      return
    }
    sendJson(res, {
      data: await getAllocationRun({
        allocationRunId,
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

  const allocationRevertMatch = url.pathname.match(/^\/api\/v1\/allocation-runs\/([^/]+)\/revert-to-draft$/)
  if (allocationRevertMatch) {
    assertMethod(req, 'POST')
    sendJson(res, {
      data: await revertAllocationRunToDraft({
        allocationRunId: decodeURIComponent(allocationRevertMatch[1]),
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

  if (url.pathname === '/api/v1/handoff-snapshots') {
    assertMethod(req, 'GET')
    sendJson(res, {
      data: await listHandoffSnapshots({ shiftId: nullable(url.searchParams.get('shiftId')) }),
    })
    return
  }

  const handoffSnapshotMatch = url.pathname.match(/^\/api\/v1\/handoff-snapshots\/([^/]+)$/)
  if (handoffSnapshotMatch) {
    assertMethod(req, 'GET')
    sendJson(res, {
      data: await getHandoffSnapshot({ snapshotId: decodeURIComponent(handoffSnapshotMatch[1]) }),
    })
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
  console.error('[API Error]:', error)
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
