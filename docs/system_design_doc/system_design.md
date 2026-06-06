# System Design Document
## ICU 護理分配決策支援系統

---

## 1. 系統概述

本系統協助 ICU 護理長在每班班前，依據病患麻煩度評估結果快速完成護理師分床，並於班中提供即時戰情室與交班摘要。

**主要使用者角色**

| 角色 | 說明 |
|------|------|
| 護理師 (nurse) | 填寫病患麻煩度評估、查看待辦任務 |
| 護理長 (charge_nurse) | 執行分床、確認分配結果、查看戰情室 |
| 管理員 (admin) | 系統管理 |

---

## 2. 系統架構

```
┌─────────────────────────────┐
│  Browser (React + Vite)     │  ← 前端 SPA
│  Vercel 部署                 │
└────────────┬────────────────┘
             │ REST / JSON  (VITE_API_BASE_URL)
             ▼
┌─────────────────────────────┐
│  Node.js HTTP Server        │  ← 後端 API
│  backend/server.mjs         │
│  Render 部署                 │
└────────────┬────────────────┘
             │ pg (node-postgres)
             ▼
┌─────────────────────────────┐
│  PostgreSQL                 │  ← 資料庫
│  sad_frontend_v2            │
└─────────────────────────────┘
```

**技術選型**

| 層級 | 技術 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 前端建置 | Vite |
| 後端 | Node.js 內建 `http` module（無框架） |
| 資料庫 | PostgreSQL + `pg` client |
| 部署（前端） | Vercel |
| 部署（後端） | Render |

---

## 3. 前端頁面結構

| 頁面檔案 | 路由 | 功能 |
|----------|------|------|
| `NurseOverviewPage.tsx` | `/nurse/overview` | 護理師查看本班病患總覽 |
| `BurdenFormPage.tsx` | `/nurse/burden-form` | 填寫病患麻煩度評估表 |
| `NurseTodoPage.tsx` | `/nurse/todo` | 查看與完成待辦任務 |
| `ChargeAllocationPage.tsx` | `/leader/allocation` | 護理長執行分床、調整建議 |
| `AllocationResultPage.tsx` | `/leader/allocation-result` | 查看已確認的分床結果 |
| `WarRoomPage.tsx` | `/leader/war-room` | 即時戰情室（全區床位與負荷） |
| `HandoverSnapshotsPage.tsx` | `/leader/handoff` | 交班單 |
| `RosterImportPage.tsx` | `/roster-import` | 匯入護理師班表（xlsx） |
| `DoctorStatPage.tsx` | `/doctor/stat` | 醫師 STAT 突發醫囑頁面 |

**前端 API 客戶端**：`src/api/client.ts`，預設指向 `http://127.0.0.1:8787/api/v1`，可透過環境變數 `VITE_API_BASE_URL` 覆蓋。

---

## 4. 後端 API 設計

**Base URL**：`/api/v1`

**通用回應格式**

```json
// 成功
{ "data": {}, "meta": {} }

// 錯誤
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} } }
```

**端點一覽**

| 方法 | 路由 | 說明 |
|------|------|------|
| GET | `/health` | 服務健康檢查 |
| GET | `/me` | 取得當前使用者（demo：王小明） |
| GET | `/shifts/current` | 取得當前班別 |
| GET | `/nurses` | 取得班別護理師清單 |
| GET | `/admissions` | 取得當前住院病患清單 |
| GET | `/nurse/overview` | 護理師病患負荷總覽 |
| GET | `/burden-assessments` | 取得麻煩度評估列表 |
| PATCH | `/burden-assessments/{id}` | 更新麻煩度評估（draft / submitted） |
| GET | `/tasks` | 取得待辦任務列表 |
| PATCH | `/tasks/{id}` | 更新任務狀態 |
| POST | `/allocation-runs/suggest` | 產生系統分床建議 |
| GET | `/allocation-runs/{id}` | 取得分床結果 |
| PUT | `/allocation-runs/{id}/items` | 更新分床項目（人工調整） |
| POST | `/allocation-runs/{id}/confirm` | 確認分床 |
| GET | `/war-room` | 取得戰情室資料 |
| GET | `/handoff-sheets` | 取得交班單資料 |

---

## 5. 資料庫設計

### 5.1 核心領域（Migration 001）

```
users ─────── nurses
  │
shifts ───── shift_nurses ───── nurses
  │
beds ──────── admissions ────── patients
```

| 資料表 | 說明 |
|--------|------|
| `users` | 系統使用者（role: nurse / charge_nurse / admin） |
| `nurses` | 護理師擴充資料（seniority_level、display_name） |
| `shifts` | 班別（day / evening / night，status: open → allocating → confirmed → closed） |
| `shift_nurses` | 班別出勤護理師（多對多） |
| `beds` | 病床 |
| `patients` | 病患基本資料 |
| `admissions` | 住院記錄（status: active / transferred / discharged） |

### 5.2 麻煩度評估（Migration 002）

```
burden_factors
     │
burden_assessments ── shifts
     │               └── admissions
burden_values ──────── burden_factors
```

| 資料表 | 說明 |
|--------|------|
| `burden_factors` | 麻煩度因素定義（objective / subjective，value_type: number / boolean / level） |
| `burden_assessments` | 每班每位病患的評估記錄（含 objective_total、subjective_total、total_score） |
| `burden_values` | 各因素的實際填寫值 |

**主觀因素計分規則**
- RASS 分數：絕對值 0–1 → 0 分、2–3 → 1 分、4+ → 2 分
- Boolean 因素：true → 2 分、false → 0 分
- Level 因素：low → 0、medium → 1、high → 2

### 5.3 任務（Migration 002）

| 資料表 | 說明 |
|--------|------|
| `tasks` | 護理待辦任務（kind: 給藥/檢查/監測/家屬/紀錄，status: pending / done / cancelled） |

### 5.4 分床（Migration 003）

```
allocation_runs ── shifts
      │
allocation_items ── admissions
                 └── nurses
```

| 資料表 | 說明 |
|--------|------|
| `allocation_runs` | 一次分床執行記錄（status: draft / confirmed / cancelled） |
| `allocation_items` | 分床項目（每位病患對應一位護理師，含 score 與 is_manual_override） |

---

## 6. 分床演算法

**版本標識**：`demo-greedy-v1`

**流程**：
1. 取得當班所有已提交的麻煩度評估，取出 `total_score`
2. 依 `total_score` 由高到低排序病患
3. 依序將每位病患分配給當前**累計負荷最低**的護理師
4. 護理長可在確認前人工調整任一分配，調整項目標記 `is_manual_override = true`
5. 護理長確認後，`allocation_runs.status` 更新為 `confirmed`

---

## 7. 環境變數

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `PORT` | `8787` | 後端監聽 port |
| `DATABASE_URL` | `postgresql://postgres@/tmp/sad_frontend_v2` | 應用程式 DB 連線 |
| `DATABASE_ADMIN_URL` | `postgresql://postgres@/tmp/postgres` | DB 建立／重置用連線 |
| `VITE_API_BASE_URL` | `http://127.0.0.1:8787/api/v1` | 前端 API 目標 |

---

## 8. 後端模組結構

| 檔案 | 說明 |
|------|------|
| `backend/server.mjs` | HTTP server 進入點，路由分發 |
| `backend/src/pgRepository.mjs` | 所有 DB 查詢實作（PostgreSQL） |
| `backend/src/db.mjs` | pg 連線池 |
| `backend/scripts/setupDatabase.mjs` | 建立 DB、套用 migration、植入 seed |
| `backend/db/migrations/` | Schema migration SQL（001–003） |
| `backend/db/seeds/` | Demo 資料 SQL（001–003） |
