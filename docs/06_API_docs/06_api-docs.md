# 06. Open API Documentation

## 1. Overview

This document describes the backend APIs used by the **ICU Nursing Allocation Decision Support System**.

The system supports ICU nursing workflows including:

- shift selection
- nurse overview
- patient burden assessment
- STAT order management
- nursing task tracking
- automatic patient-bed allocation
- handoff snapshot generation
- handoff archive lookup
- war room dashboard

---

## 2. Base Information

| Item | Value |
|---|---|
| Base URL | `http://127.0.0.1:8787/api/v1` |
| Data format | JSON |
| Authentication | Demo user based / local development |
| Swagger UI | Not configured in this project |

### Swagger UI

Currently, this project does **not** provide a Swagger UI endpoint.

If Swagger UI is added later, the URL can be documented here, for example:

```text
http://127.0.0.1:8787/api-docs
```

---

## 3. Common Response Format

Most API responses follow this structure:

```json
{
  "data": {}
}
```

For list responses:

```json
{
  "data": []
}
```

For error responses:

```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Error message",
    "details": {}
  }
}
```

---

## 4. Common Parameters

### `shiftId`

Many APIs require a `shiftId` because most data is shift-specific.

Example shift IDs:

| Shift | shiftId |
|---|---|
| 2026/05/19 白班 07:00-15:00 | `00000000-0000-0000-0000-000000000202` |
| 2026/05/19 小夜班 15:00-23:00 | `00000000-0000-0000-0000-000000000203` |
| 2026/05/19 大夜班 23:00-07:00 | `00000000-0000-0000-0000-000000000204` |

---

## 5. System APIs

### GET `/`

Returns basic backend API information and available endpoints.

#### Example Response

```json
{
  "data": {
    "name": "ICU Nursing Allocation API",
    "baseUrl": "/api/v1",
    "endpoints": [
      "GET /api/v1/health",
      "GET /api/v1/me",
      "GET /api/v1/shifts"
    ]
  }
}
```

---

### GET `/health`

Checks whether the backend server is running.

#### Example Response

```json
{
  "data": {
    "ok": true
  }
}
```

---

## 6. User API

### GET `/me`

Returns the current user information.

#### Query Parameters

| Name | Type | Required | Description |
|---|---|---:|---|
| `userId` | string | No | Demo user ID |

#### Example Request

```text
GET /api/v1/me?userId=00000000-0000-0000-0000-000000000110
```

#### Example Response

```json
{
  "data": {
    "id": "00000000-0000-0000-0000-000000000110",
    "shortName": "陳O琪",
    "role": "nurse"
  }
}
```

---

## 7. Shift APIs

### GET `/shifts`

Returns all shifts.

#### Example Response

```json
{
  "data": [
    {
      "id": "00000000-0000-0000-0000-000000000203",
      "shiftKey": "evening",
      "label": "2026/05/19 小夜班 15:00-23:00",
      "startsAt": "2026-05-19T07:00:00.000Z",
      "endsAt": "2026-05-19T15:00:00.000Z",
      "status": "confirmed",
      "hidden": false,
      "chargeNurse": {
        "id": "00000000-0000-0000-0000-000000000110",
        "shortName": "陳O琪"
      },
      "nurseIds": []
    }
  ]
}
```

---

### GET `/shifts/current`

Returns the current or default shift.

#### Example Request

```text
GET /api/v1/shifts/current
```

---

## 8. Nurse APIs

### GET `/nurses`

Returns the nurse list.

#### Example Request

```text
GET /api/v1/nurses
```

---

### GET `/nurses?shiftId={shiftId}`

Returns nurses related to a specific shift.

#### Query Parameters

| Name | Type | Required | Description |
|---|---|---:|---|
| `shiftId` | string | No | Shift ID used to filter nurses |

#### Example Request

```text
GET /api/v1/nurses?shiftId=00000000-0000-0000-0000-000000000203
```

---

## 9. Nurse Overview API

### GET `/nurse/overview?shiftId={shiftId}`

Returns overview data for the nurse homepage.

This API is used to display:

- current shift summary
- selected nurse
- assigned patients
- all patients in the shift
- workload information

#### Query Parameters

| Name | Type | Required | Description |
|---|---|---:|---|
| `shiftId` | string | Yes | Current shift ID |

#### Example Request

```text
GET /api/v1/nurse/overview?shiftId=00000000-0000-0000-0000-000000000203
```

---

## 10. Burden Assessment APIs

### GET `/burden-assessments?shiftId={shiftId}&scope={scope}`

Returns burden assessment records.

#### Query Parameters

| Name | Type | Required | Description |
|---|---|---:|---|
| `shiftId` | string | Yes | Shift ID |
| `scope` | string | No | `mine` or `all` |

#### Example Request

```text
GET /api/v1/burden-assessments?shiftId=00000000-0000-0000-0000-000000000203&scope=mine
```

---

### PATCH `/burden-assessments/{assessmentId}`

Updates a burden assessment.

#### Path Parameters

| Name | Type | Description |
|---|---|---|
| `assessmentId` | string | Burden assessment ID |

#### Example Request Body

```json
{
  "objective": {
    "mobility": 2,
    "monitoring": 3
  },
  "subjective": {
    "isolation": true,
    "familyCommunication": "high"
  }
}
```

---

## 11. Task APIs

### GET `/tasks?shiftId={shiftId}`

Returns task data for the selected shift.

#### Query Parameters

| Name | Type | Required | Description |
|---|---|---:|---|
| `shiftId` | string | Yes | Shift ID |
| `assignee` | string | No | Example: `me` |
| `status` | string | No | Example: `pending` |
| `kind` | string | No | Task type |

#### Example Request

```text
GET /api/v1/tasks?shiftId=00000000-0000-0000-0000-000000000203&assignee=me&status=pending
```

---

### PATCH `/tasks/{taskId}`

Updates a task.

#### Path Parameters

| Name | Type | Description |
|---|---|---|
| `taskId` | string | Task ID |

#### Example Request Body

```json
{
  "status": "completed"
}
```

---

## 12. STAT Order APIs

### GET `/stat-orders?shiftId={shiftId}`

Returns STAT orders for the selected shift.

#### Query Parameters

| Name | Type | Required | Description |
|---|---|---:|---|
| `shiftId` | string | Yes | Shift ID |

#### Example Request

```text
GET /api/v1/stat-orders?shiftId=00000000-0000-0000-0000-000000000203
```

---

### POST `/stat-orders`

Creates a new STAT order.

#### Example Request Body

```json
{
  "shiftId": "00000000-0000-0000-0000-000000000203",
  "admissionId": "00000000-0000-0000-0000-000000000501",
  "title": "STAT Chest X-ray",
  "kind": "STAT",
  "urgent": true
}
```

---

### PATCH `/stat-orders/{orderId}`

Updates a STAT order.

#### Path Parameters

| Name | Type | Description |
|---|---|---|
| `orderId` | string | STAT order ID |

---

## 13. Allocation Run APIs

### GET `/allocation-runs/current?shiftId={shiftId}`

Returns the current allocation run for the selected shift.

#### Query Parameters

| Name | Type | Required | Description |
|---|---|---:|---|
| `shiftId` | string | Yes | Shift ID |

---

### POST `/allocation-runs/suggest`

Creates a suggested allocation run.

This API is used by the charge nurse to generate a suggested patient-bed allocation.

#### Example Request Body

```json
{
  "shiftId": "00000000-0000-0000-0000-000000000202",
  "targetShiftId": "00000000-0000-0000-0000-000000000203"
}
```

#### Field Description

| Field | Description |
|---|---|
| `shiftId` | Source shift used for evaluation |
| `targetShiftId` | Next shift that will receive the allocation result |

---

### GET `/allocation-runs/{allocationRunId}`

Returns allocation run details.

#### Path Parameters

| Name | Type | Description |
|---|---|---|
| `allocationRunId` | string | Allocation run ID |

---

### GET `/allocation-runs/{allocationRunId}/items`

Returns allocation items for a specific allocation run.

---

### POST `/allocation-runs/{allocationRunId}/confirm`

Confirms an allocation run.

After confirmation:

1. the allocation run becomes confirmed
2. the result is sealed
3. a handoff snapshot is created
4. the snapshot should be stored using the `targetShiftId`

#### Important Behavior

The handoff snapshot must be stored under the **target shift**, not only the source shift.

Example:

| Source Shift | Target Shift | Snapshot should be stored in |
|---|---|---|
| 2026/05/19 白班 | 2026/05/19 小夜班 | 2026/05/19 小夜班 |

---

## 14. War Room API

### GET `/war-room?shiftId={shiftId}`

Returns dashboard data for the selected shift.

This API is used by the war room page to show:

- nurse workload
- patient distribution
- urgent task summary
- STAT order summary
- workload imbalance

#### Query Parameters

| Name | Type | Required | Description |
|---|---|---:|---|
| `shiftId` | string | Yes | Shift ID |

---

## 15. Handoff Sheet API

### GET `/handoff-sheets?shiftId={shiftId}`

Returns handoff sheet data for the selected shift.

#### Query Parameters

| Name | Type | Required | Description |
|---|---|---:|---|
| `shiftId` | string | Yes | Shift ID |

---

## 16. Handoff Snapshot APIs

### GET `/handoff-snapshots`

Returns all handoff snapshot records.

---

### GET `/handoff-snapshots?shiftId={shiftId}`

Returns handoff snapshots for a specific shift.

#### Query Parameters

| Name | Type | Required | Description |
|---|---|---:|---|
| `shiftId` | string | Yes | Shift ID |

#### Example Request

```text
GET /api/v1/handoff-snapshots?shiftId=00000000-0000-0000-0000-000000000203
```

#### Example Response

```json
{
  "data": [
    {
      "id": "711326f0-ea04-4f0a-9b07-c2d0b4eca7ac",
      "allocationRunId": "00000000-0000-0000-0000-000000000501",
      "shiftId": "00000000-0000-0000-0000-000000000203",
      "shiftKey": "evening",
      "shiftLabel": "2026/5/19 小夜班 15:00-23:00",
      "createdAt": "2026-06-05T15:51:29.098Z",
      "createdBy": "陳O琪",
      "summary": {
        "patientCount": 17,
        "nurseCount": 9,
        "statTotal": 33,
        "avgLoad": 39.3,
        "maxLoad": 72
      }
    }
  ]
}
```

---

### GET `/handoff-snapshots/{snapshotId}`

Returns details of a specific handoff snapshot.

#### Path Parameters

| Name | Type | Description |
|---|---|---|
| `snapshotId` | string | Handoff snapshot ID |

---

## 17. Main User Flows

### 17.1 Nurse Flow

1. Select shift.
2. Select nurse.
3. View assigned patients.
4. Fill in burden assessment.
5. Check STAT orders and tasks.

---

### 17.2 Charge Nurse Allocation Flow

1. Select the source shift.
2. Enter the allocation page.
3. Generate suggested allocation.
4. Review decision trace.
5. Confirm allocation.
6. Backend creates a handoff snapshot.
7. The next shift can view the handoff result.

---

### 17.3 Handoff Snapshot Flow

```text
Source shift allocation
        ↓
Confirm allocation
        ↓
Create handoff snapshot
        ↓
Save snapshot with targetShiftId
        ↓
Next shift can view the sealed handoff result
```

---

## 18. Notes

- Most APIs are shift-based and require `shiftId`.
- The frontend communicates with the backend using helper methods such as `apiGet`, `apiPost`, and `apiPatch`.
- Handoff snapshots are used to preserve confirmed allocation results.
- Confirmed allocation should save the snapshot to the target shift.
- Swagger UI is not currently configured.