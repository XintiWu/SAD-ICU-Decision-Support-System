# 08. 後端資料庫 Schema Diagram 與 ER Diagram

本文件依據目前後端部署使用的 PostgreSQL schema 產生，來源為 `backend/db/migrations/001` 至 `006`。資料庫支援 ICU 護理分配決策系統的班別、人員、病床、病患入院、麻煩度評估、任務、分床、STAT 醫囑與交班快照。

`Schema Diagram` 用來呈現實際資料表、欄位、PK/FK/UK 與資料型別；`ER Diagram` 用來呈現業務概念中的 entity 與 relationship，方便說明系統如何串起照護流程。

## 系統模組

| 模組 | 主要資料表 | 說明 |
| :--- | :--- | :--- |
| 人員與班別 | `users`, `nurses`, `shifts`, `shift_nurses` | 使用者、護理師資料、班別與班別出勤名單 |
| 病床與病患 | `beds`, `patients`, `admissions` | ICU 病床、病患主檔、住院/床位紀錄 |
| 麻煩度與任務 | `burden_factors`, `burden_assessments`, `burden_values`, `tasks` | 客觀/主觀麻煩度評估與護理任務 |
| 分床 | `allocation_runs`, `allocation_items` | 分床建議批次與每位病患分配結果 |
| 突發醫囑 | `stat_orders` | STAT/突發醫囑事件 |
| 交班 | `handoff_snapshots`, `handoff_rows` | 已確認分床後產生的交班快照與列資料 |

## Schema Diagram

```mermaid
erDiagram
  USERS {
    uuid id PK
    varchar name
    varchar role
    varchar employee_no UK
    timestamptz created_at
  }

  NURSES {
    uuid id PK, FK
    varchar display_name
    varchar short_name
    varchar seniority_level
    boolean is_active
  }

  SHIFTS {
    uuid id PK
    varchar unit_name
    varchar shift_key
    timestamptz starts_at
    timestamptz ends_at
    uuid charge_nurse_id FK
    varchar status
    boolean hidden
    timestamptz created_at
    timestamptz updated_at
  }

  SHIFT_NURSES {
    uuid shift_id PK, FK
    uuid nurse_id PK, FK
    varchar role
  }

  BEDS {
    uuid id PK
    varchar unit_name UK
    int bed_no UK
    varchar label UK
    boolean is_active
  }

  PATIENTS {
    uuid id PK
    varchar medical_record_no UK
    varchar name
    varchar sex
    date birth_date
    timestamptz created_at
  }

  ADMISSIONS {
    uuid id PK
    uuid patient_id FK
    uuid bed_id FK
    text diagnosis
    date admitted_at
    varchar attending_physician
    varchar status
    timestamptz created_at
    timestamptz updated_at
  }

  BURDEN_FACTORS {
    uuid id PK
    varchar code UK
    varchar label
    varchar category
    varchar value_type
    boolean is_active
    int sort_order
  }

  BURDEN_ASSESSMENTS {
    uuid id PK
    uuid shift_id FK, UK
    uuid admission_id FK, UK
    uuid submitted_by FK
    varchar status
    int objective_total
    int subjective_total
    int total_score
    timestamptz submitted_at
    timestamptz updated_at
  }

  BURDEN_VALUES {
    uuid id PK
    uuid assessment_id FK, UK
    uuid factor_id FK, UK
    numeric number_value
    boolean boolean_value
    int level_value
    int points
  }

  TASKS {
    uuid id PK
    uuid shift_id FK
    uuid admission_id FK
    uuid assigned_nurse_id FK
    text title
    varchar kind
    boolean urgent
    varchar source
    varchar status
    timestamptz completed_at
    uuid completed_by FK
    timestamptz created_at
  }

  ALLOCATION_RUNS {
    uuid id PK
    uuid shift_id FK
    uuid target_shift_id FK
    uuid created_by FK
    varchar status
    varchar algorithm_version
    timestamptz suggested_at
    timestamptz confirmed_at
    jsonb decision_logs
  }

  ALLOCATION_ITEMS {
    uuid id PK
    uuid allocation_run_id FK, UK
    uuid admission_id FK, UK
    uuid nurse_id FK
    int score
    int sort_order
    boolean is_manual_override
  }

  STAT_ORDERS {
    uuid id PK
    uuid shift_id FK
    uuid admission_id FK
    text title
    varchar kind
    varchar ordered_by
    varchar ordered_at_display
    text reason
    varchar status
    timestamptz created_at
  }

  HANDOFF_SNAPSHOTS {
    uuid id PK
    uuid allocation_run_id FK, UK
    uuid shift_id FK
    uuid created_by FK
    timestamptz created_at
    int patient_count
    int nurse_count
    int stat_total
    numeric avg_load
    int max_load
    int unassigned_count
    int total_beds
    int total_nurses
    jsonb nurse_blocks
  }

  HANDOFF_ROWS {
    uuid id PK
    uuid snapshot_id FK, UK
    uuid admission_id FK, UK
    int sort_order
    varchar bed_label
    varchar patient_name
    text diagnosis
    varchar sex
    int age
    date admitted_at
    varchar attending_physician
    varchar current_nurse
    varchar next_nurse
    int burden_score
    int objective_score
    int subjective_score
    text handoff_diagnosis
    text burden_detail
  }

  USERS ||--o| NURSES : "profile"
  NURSES ||--o{ SHIFTS : "charge_nurse_id"
  SHIFTS ||--o{ SHIFT_NURSES : "shift_id"
  NURSES ||--o{ SHIFT_NURSES : "nurse_id"
  BEDS ||--o{ ADMISSIONS : "bed_id"
  PATIENTS ||--o{ ADMISSIONS : "patient_id"
  SHIFTS ||--o{ BURDEN_ASSESSMENTS : "shift_id"
  ADMISSIONS ||--o{ BURDEN_ASSESSMENTS : "admission_id"
  NURSES ||--o{ BURDEN_ASSESSMENTS : "submitted_by"
  BURDEN_ASSESSMENTS ||--o{ BURDEN_VALUES : "assessment_id"
  BURDEN_FACTORS ||--o{ BURDEN_VALUES : "factor_id"
  SHIFTS ||--o{ TASKS : "shift_id"
  ADMISSIONS ||--o{ TASKS : "admission_id"
  NURSES ||--o{ TASKS : "assigned/completed"
  SHIFTS ||--o{ ALLOCATION_RUNS : "shift_id"
  SHIFTS ||--o{ ALLOCATION_RUNS : "target_shift_id"
  NURSES ||--o{ ALLOCATION_RUNS : "created_by"
  ALLOCATION_RUNS ||--o{ ALLOCATION_ITEMS : "allocation_run_id"
  ADMISSIONS ||--o{ ALLOCATION_ITEMS : "admission_id"
  NURSES ||--o{ ALLOCATION_ITEMS : "nurse_id"
  SHIFTS ||--o{ STAT_ORDERS : "shift_id"
  ADMISSIONS ||--o{ STAT_ORDERS : "admission_id"
  ALLOCATION_RUNS ||--o| HANDOFF_SNAPSHOTS : "allocation_run_id"
  SHIFTS ||--o{ HANDOFF_SNAPSHOTS : "shift_id"
  NURSES ||--o{ HANDOFF_SNAPSHOTS : "created_by"
  HANDOFF_SNAPSHOTS ||--o{ HANDOFF_ROWS : "snapshot_id"
  ADMISSIONS ||--o{ HANDOFF_ROWS : "admission_id"
```

## ER Diagram

```mermaid
flowchart LR
  classDef entity fill:#ffffff,stroke:#111111,stroke-width:1.5px,color:#111111,font-weight:bold
  classDef rel fill:#f3f3f3,stroke:#111111,stroke-width:1.5px,color:#111111

  subgraph STAFF["人員與班別"]
    USERS[USERS]:::entity
    NURSES[NURSES]:::entity
    SHIFTS[SHIFTS]:::entity
    SHIFT_NURSES[SHIFT_NURSES]:::entity
    USERS -- profile --> NURSES
    NURSES -- charges --> SHIFTS
    SHIFTS -- roster --> SHIFT_NURSES
    NURSES -- works --> SHIFT_NURSES
  end

  subgraph CARE["病床與病患"]
    BEDS[BEDS]:::entity
    PATIENTS[PATIENTS]:::entity
    ADMISSIONS[ADMISSIONS]:::entity
    BEDS -- hosts --> ADMISSIONS
    PATIENTS -- admits --> ADMISSIONS
  end

  subgraph BURDEN["麻煩度評估"]
    BURDEN_FACTORS[BURDEN_FACTORS]:::entity
    BURDEN_ASSESSMENTS[BURDEN_ASSESSMENTS]:::entity
    BURDEN_VALUES[BURDEN_VALUES]:::entity
    BURDEN_ASSESSMENTS -- has --> BURDEN_VALUES
    BURDEN_FACTORS -- scores --> BURDEN_VALUES
  end

  subgraph WORK["任務與突發醫囑"]
    TASKS[TASKS]:::entity
    STAT_ORDERS[STAT_ORDERS]:::entity
  end

  subgraph ALLOC["分床"]
    ALLOCATION_RUNS[ALLOCATION_RUNS]:::entity
    ALLOCATION_ITEMS[ALLOCATION_ITEMS]:::entity
    ALLOCATION_RUNS -- has --> ALLOCATION_ITEMS
  end

  subgraph HANDOFF["交班"]
    HANDOFF_SNAPSHOTS[HANDOFF_SNAPSHOTS]:::entity
    HANDOFF_ROWS[HANDOFF_ROWS]:::entity
    HANDOFF_SNAPSHOTS -- contains --> HANDOFF_ROWS
  end

  SHIFTS -- contains --> BURDEN_ASSESSMENTS
  ADMISSIONS -- assessed --> BURDEN_ASSESSMENTS
  NURSES -- submits --> BURDEN_ASSESSMENTS

  SHIFTS -- contains --> TASKS
  ADMISSIONS -- generates --> TASKS
  NURSES -- assigned/completed --> TASKS

  SHIFTS -- contains --> STAT_ORDERS
  ADMISSIONS -- has --> STAT_ORDERS

  SHIFTS -- source/target --> ALLOCATION_RUNS
  NURSES -- creates --> ALLOCATION_RUNS
  ADMISSIONS -- assigned --> ALLOCATION_ITEMS
  NURSES -- receives --> ALLOCATION_ITEMS

  ALLOCATION_RUNS -- produces --> HANDOFF_SNAPSHOTS
  SHIFTS -- archives --> HANDOFF_SNAPSHOTS
  NURSES -- creates --> HANDOFF_SNAPSHOTS
  ADMISSIONS -- snapshotted --> HANDOFF_ROWS
```

## 關鍵關係說明

| 關係 | Cardinality | 說明 |
| :--- | :--- | :--- |
| `users` → `nurses` | 1 → 0..1 | 護理師是使用者的一種 profile，`nurses.id` 同時也是 `users.id` |
| `shifts` ↔ `nurses` | M ↔ N | 透過 `shift_nurses` 表達班別出勤名單 |
| `beds` → `admissions` | 1 → N | 同一病床可有歷史入院紀錄，但 active 狀態每床只允許一筆 |
| `patients` → `admissions` | 1 → N | 同一病患可有多次入院紀錄 |
| `burden_assessments` → `burden_values` | 1 → N | 一份麻煩度評估包含多個 factor value |
| `allocation_runs` → `allocation_items` | 1 → N | 一次分床建議產生多筆病患-護理師分配 |
| `allocation_runs` → `handoff_snapshots` | 1 → 0..1 | 每次已確認分床最多產生一份交班快照 |
| `handoff_snapshots` → `handoff_rows` | 1 → N | 快照保存當下交班列資料，包含冗餘文字欄位以利歷史追溯 |

## 設計重點

- `allocation_runs.decision_logs` 和 `handoff_snapshots.nurse_blocks` 使用 `jsonb` 保存演算法決策與交班展示區塊，屬於刻意反正規化，方便保留當下狀態。
- `handoff_rows` 保存床號、病患姓名、診斷、護理師名稱等文字快照，即使原始病患或護理師資料日後異動，歷史交班內容仍可重現。
- `burden_assessments` 以 `(shift_id, admission_id)` 做唯一限制，代表同一班別對同一入院病患只會有一份麻煩度評估。
- `allocation_items` 以 `(allocation_run_id, admission_id)` 做唯一限制，代表同一次分床中同一病患只會被分配一次。
- `stat_orders` 與 `tasks` 都掛在 `shift_id` 和 `admission_id` 下，但用途不同：`stat_orders` 表示突發醫囑事件，`tasks` 表示護理待辦工作。
