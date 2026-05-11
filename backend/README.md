# Backend README

本資料夾是 ICU 護理分配決策支援系統的後端實作。後端目前使用 Node.js 內建 HTTP server、PostgreSQL、REST JSON API，提供前端讀取病人、麻煩度、TO-DO、分床、戰情室與交班表資料。

## Current Architecture

- API server: `backend/server.mjs`
- API base path: `/api/v1`
- Database: PostgreSQL
- DB client: `pg`
- DB helper: `backend/src/db.mjs`
- Runtime repository: `backend/src/pgRepository.mjs`
- DB setup script: `backend/scripts/setupDatabase.mjs`
- Demo database name: `sad_frontend_v2`

Legacy in-memory files (`step1Repository.mjs`, `step2Repository.mjs`, `step3Repository.mjs`) are kept for reference, but the running API now imports `pgRepository.mjs`.

## Quick Start

From the project root:

```bash
npm install
npm run db:setup
npm run api:dev
```

Default API URL:

```txt
http://127.0.0.1:8787/api/v1
```

Health check:

```bash
curl http://127.0.0.1:8787/api/v1/health
```

Expected response:

```json
{
  "data": {
    "ok": true
  }
}
```

Frontend development needs both servers:

```bash
npm run api:dev
npm run dev
```

If the API is not on `8787`, start the frontend with:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8791/api/v1 npm run dev
```

## Database Setup

`npm run db:setup` creates and resets the local demo database.

It will:

1. Drop `sad_frontend_v2` if it exists.
2. Create `sad_frontend_v2`.
3. Apply migrations:
   - `backend/db/migrations/001_core_schema.sql`
   - `backend/db/migrations/002_burden_tasks_schema.sql`
   - `backend/db/migrations/003_allocation_schema.sql`
4. Apply demo seeds:
   - `backend/db/seeds/001_demo_core_data.sql`
   - `backend/db/seeds/002_demo_burden_tasks_data.sql`
   - `backend/db/seeds/003_demo_allocation_data.sql`
5. Fill complete demo data from the Step 1-3 data modules.

Default connection values:

```txt
DATABASE_ADMIN_URL=postgresql://postgres@%2Ftmp/postgres
DATABASE_URL=postgresql://postgres@%2Ftmp/sad_frontend_v2
```

You can override them:

```bash
DATABASE_ADMIN_URL=postgresql://postgres:password@localhost:5432/postgres \
DATABASE_URL=postgresql://postgres:password@localhost:5432/sad_frontend_v2 \
npm run db:setup
```

Then run the API with the same `DATABASE_URL`:

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/sad_frontend_v2 npm run api:dev
```

## Response Format

Success responses:

```json
{
  "data": {},
  "meta": {}
}
```

Error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "欄位格式錯誤",
    "details": {}
  }
}
```

Temporary current-user behavior:

- Defaults to demo nurse `王小明`.
- Override with `X-User-Id` header or `userId` query parameter.

## Implemented Endpoints

Core:

- `GET /api/v1/health`
- `GET /api/v1/me`
- `GET /api/v1/shifts/current`
- `GET /api/v1/nurses?shiftId={shiftId}`
- `GET /api/v1/admissions?shiftId={shiftId}&status=active`
- `GET /api/v1/nurse/overview?shiftId={shiftId}`

Burden and tasks:

- `GET /api/v1/burden-assessments?shiftId={shiftId}&scope=mine`
- `PATCH /api/v1/burden-assessments/{assessmentId}`
- `GET /api/v1/tasks?shiftId={shiftId}&assignee=me&status=pending&kind=給藥`
- `PATCH /api/v1/tasks/{taskId}`

Allocation:

- `POST /api/v1/allocation-runs/suggest`
- `GET /api/v1/allocation-runs/{allocationRunId}`
- `PUT /api/v1/allocation-runs/{allocationRunId}/items`
- `POST /api/v1/allocation-runs/{allocationRunId}/confirm`

Operational views:

- `GET /api/v1/war-room?shiftId={shiftId}`
- `GET /api/v1/handoff-sheets?shiftId={shiftId}`

## Useful IDs In Demo Data

Current shift:

```txt
00000000-0000-0000-0000-000000000201
```

Seeded allocation run:

```txt
00000000-0000-0000-0000-000000000901
```

## API Examples

List burden assessments:

```bash
curl 'http://127.0.0.1:8787/api/v1/burden-assessments?shiftId=00000000-0000-0000-0000-000000000201&scope=mine'
```

Update burden assessment:

```bash
curl -X PATCH http://127.0.0.1:8787/api/v1/burden-assessments/00000000-0000-0000-0000-000000000602 \
  -H 'content-type: application/json' \
  -d '{"subjective":{"rassScore":null,"agitatedFallRisk":false,"agitatedTubeRemovalRisk":true,"drainageTube":false,"tubeFeeding":true,"dressingChangeFrequency":1,"vitalMonitoringFrequency":2},"status":"draft"}'
```

Notes:

- `rassScore` can be `null`.
- `dressingChangeFrequency` and `vitalMonitoringFrequency` must be `0`, `1`, or `2`.
- When a subjective value is `null`, the backend deletes that `burden_values` row instead of inserting an empty value.

Update task status:

```bash
curl -X PATCH http://127.0.0.1:8787/api/v1/tasks/00000000-0000-0000-0000-000000000705 \
  -H 'content-type: application/json' \
  -d '{"status":"done"}'
```

Generate allocation suggestion:

```bash
curl -X POST http://127.0.0.1:8787/api/v1/allocation-runs/suggest \
  -H 'content-type: application/json' \
  -d '{"shiftId":"00000000-0000-0000-0000-000000000201","targetShiftId":"00000000-0000-0000-0000-000000000201"}'
```

Update allocation items:

```bash
curl -X PUT http://127.0.0.1:8787/api/v1/allocation-runs/{allocationRunId}/items \
  -H 'content-type: application/json' \
  -d '{"items":[{"admissionId":"00000000-0000-0000-0000-000000000502","nurseId":"00000000-0000-0000-0000-000000000101","sortOrder":1,"isManualOverride":true}]}'
```

Confirm allocation:

```bash
curl -X POST http://127.0.0.1:8787/api/v1/allocation-runs/{allocationRunId}/confirm \
  -H 'content-type: application/json' \
  -d '{}'
```

## Frontend Integration

The frontend API client is:

```txt
src/api/client.ts
```

Default frontend API target:

```txt
http://127.0.0.1:8787/api/v1
```

Currently wired pages:

- `/nurse/overview`
- `/nurse/burden-form`
- `/nurse/todo`
- `/leader/allocation`
- `/leader/allocation-result`
- `/leader/war-room`

`OrdersImportPage.tsx` exists but is not routed yet.

## Verification

Recommended checks after backend changes:

```bash
npm run db:setup
npm run lint
npm run build
```

For API smoke testing, start the API and call `/health`, `/nurse/overview`, `/burden-assessments`, `/tasks`, `/allocation-runs/suggest`, `/war-room`, and `/handoff-sheets`.

## Known Remaining Work

- Step 4: order import.
- Step 4: formal handoff snapshot tables and persisted handoff rows.
- Authentication and role enforcement beyond demo `X-User-Id`.
- Production-grade migration tooling.
- Automated end-to-end tests for button flows.
