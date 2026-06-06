# Frontend / Backend Integration Scan

本文件記錄目前前後端整合健檢結果，重點是確認前端可達頁面與按鈕是否能連到後端 API 與 PostgreSQL。

## Current Summary

- Backend is connected to PostgreSQL through `backend/src/db.mjs`.
- Runtime API logic uses `backend/src/pgRepository.mjs`.
- Database setup is available through `npm run db:setup`.
- Frontend API client is `src/api/client.ts`.
- Frontend default API URL is `http://127.0.0.1:8787/api/v1`.
- Main reachable pages are wired to backend APIs.
- Build and lint are passing after the latest backend fix.

## Current Progress

- [x] Inventory frontend routes and clickable controls.
- [x] Map frontend controls to backend API/data needs.
- [x] Connect backend runtime to PostgreSQL.
- [x] Add database setup command.
- [x] Add frontend API client.
- [x] Wire nurse overview to backend.
- [x] Wire burden form buttons to backend persistence.
- [x] Wire TO-DO checkbox updates to backend persistence.
- [x] Wire allocation suggestion, reassignment, and confirmation to backend persistence.
- [x] Wire allocation result to backend handoff sheet.
- [x] Wire war-room to backend data.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.
- [ ] Route and implement order import.
- [ ] Persist formal handoff snapshots.
- [ ] Add automated E2E tests.

## Route And Button Status

### AppShell Navigation

Status: working.

- `護理師首頁`: navigates to `/nurse/overview`.
- `麻煩度填寫`: navigates to `/nurse/burden-form`.
- `TO-DO`: navigates to `/nurse/todo`.
- `指派分床配對`: navigates to `/leader/allocation`.
- `查看分床結果`: navigates to `/leader/allocation-result`.
- `戰情室`: navigates to `/leader/war-room`.

### `/nurse/overview`

Status: backend-connected read-only page.

- Reads `GET /api/v1/nurse/overview`.
- Reads burden assessments for summary display.
- No write buttons on this page.

### `/nurse/burden-form`

Status: backend-connected and persistent.

- `客觀（系統）` tab: reads objective values from backend.
- `主觀（自填）` tab: edits local form state before save.
- RASS input: supports number or blank.
- Yes/No buttons: update form state.
- Low/Mid/High buttons: update form state.
- Header `儲存`: persists submitted data with `PATCH /api/v1/burden-assessments/{assessmentId}`.
- Bottom `儲存草稿`: persists draft data.
- Bottom `送出`: persists submitted data.

Backend notes:

- Subjective `null` values now delete the corresponding `burden_values` row.
- This avoids `burden_values_check` violations when `rassScore` is blank.

### `/nurse/todo`

Status: backend-connected and persistent.

- `全部`, `待完成`, `已完成`: local filter over backend task data.
- Kind chips: local filter over backend task data.
- `清除`: clears local kind filter.
- Task checkbox: calls `PATCH /api/v1/tasks/{taskId}` and persists status.
- `+N 更多`, `顯示全部`, `收合`: local expand/collapse UI state.

### `/leader/allocation`

Status: backend-connected and persistent.

- Initial run: reads seeded allocation run when available.
- `系統建議分床`: calls `POST /api/v1/allocation-runs/suggest`.
- Nurse reassignment select: calls `PUT /api/v1/allocation-runs/{allocationRunId}/items`.
- `確認送出`: calls `POST /api/v1/allocation-runs/{allocationRunId}/confirm`, then navigates to allocation result.

### `/leader/allocation-result`

Status: backend-connected read-only page.

- Reads `GET /api/v1/handoff-sheets?shiftId={shiftId}`.
- Shows patient, bed, diagnosis, burden score, current nurse, and next nurse.

Current limitation:

- This is a live derived handoff sheet, not a persisted historical snapshot table yet.

### `/leader/war-room`

Status: backend-connected read-only page with local expand/collapse.

- Reads `GET /api/v1/war-room?shiftId={shiftId}`.
- Uses backend allocation, burden score, and task data.
- `展開細節` / `收起細節`: local UI state only.
- Expanded checkboxes are read-only display.

### `OrdersImportPage`

Status: not reachable.

- `src/pages/OrdersImportPage.tsx` exists.
- It is not mounted in `src/App.tsx`.
- Step 4 order import API is not implemented yet.

## Backend API Coverage

Verified implemented endpoints:

- `GET /api/v1/health`
- `GET /api/v1/me`
- `GET /api/v1/shifts/current`
- `GET /api/v1/nurses?shiftId={shiftId}`
- `GET /api/v1/admissions?shiftId={shiftId}&status=active`
- `GET /api/v1/nurse/overview?shiftId={shiftId}`
- `GET /api/v1/burden-assessments?shiftId={shiftId}&scope=mine`
- `PATCH /api/v1/burden-assessments/{assessmentId}`
- `GET /api/v1/tasks?shiftId={shiftId}&assignee=me`
- `PATCH /api/v1/tasks/{taskId}`
- `POST /api/v1/allocation-runs/suggest`
- `GET /api/v1/allocation-runs/{allocationRunId}`
- `PUT /api/v1/allocation-runs/{allocationRunId}/items`
- `POST /api/v1/allocation-runs/{allocationRunId}/confirm`
- `GET /api/v1/war-room?shiftId={shiftId}`
- `GET /api/v1/handoff-sheets?shiftId={shiftId}`

## Database Coverage

Database artifacts present:

- `backend/db/migrations/001_core_schema.sql`
- `backend/db/migrations/002_burden_tasks_schema.sql`
- `backend/db/migrations/003_allocation_schema.sql`
- `backend/db/seeds/001_demo_core_data.sql`
- `backend/db/seeds/002_demo_burden_tasks_data.sql`
- `backend/db/seeds/003_demo_allocation_data.sql`

Runtime DB wiring:

- `pg` dependency installed.
- `DATABASE_URL` default: `postgresql://postgres@%2Ftmp/sad_frontend_v2`.
- `DATABASE_ADMIN_URL` default: `postgresql://postgres@%2Ftmp/postgres`.
- `npm run db:setup` resets and seeds the local DB.

## Verification Log

Commands run successfully:

```bash
npm run lint
npm run build
```

Recent backend issue fixed:

- Error: `new row for relation "burden_values" violates check constraint "burden_values_check"`.
- Cause: blank `rassScore` sent `null`, but backend attempted to insert a `burden_values` row with all value columns null.
- Fix: `upsertSubjectiveValue` now deletes the value row when the incoming value is `null`.

Previously verified API smoke flow:

- `GET /health`: ok.
- `GET /nurse/overview`: returned current nurse patients.
- `PATCH /burden-assessments/{id}`: saved subjective values.
- `PATCH /tasks/{id}`: toggled task status.
- `POST /allocation-runs/suggest`: created DB-backed draft run.
- `POST /allocation-runs/{id}/confirm`: confirmed run with no unassigned patients.
- `GET /war-room`: returned nurse/task data.
- `GET /handoff-sheets`: returned handoff rows.

## How To Run Locally

Backend:

```bash
npm run db:setup
npm run api:dev
```

Frontend:

```bash
npm run dev
```

If frontend shows `Failed to fetch`:

1. Confirm backend is running.
2. Check `curl http://127.0.0.1:8787/api/v1/health`.
3. If backend uses another port, set `VITE_API_BASE_URL`.

## Remaining Risks / Gaps

- Step 4 order import is not implemented.
- `OrdersImportPage.tsx` is not routed.
- Handoff sheet is derived live, not persisted as formal snapshot rows.
- Auth is demo-only via default user or `X-User-Id`.
- No automated E2E tests yet.
