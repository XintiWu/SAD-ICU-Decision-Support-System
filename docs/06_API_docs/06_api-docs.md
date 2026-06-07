# 06. Open API Documentation

## Overview

This document describes the backend API used by the ICU Nursing Allocation Decision Support System.

- Base URL: `http://127.0.0.1:8787/api/v1`
- Format: JSON
- Swagger UI: Not configured in this project.

---

## 1. System / Health

### GET `/`

Returns basic API information and available endpoints.

### GET `/api/v1/health`

Checks whether the backend server is running.

---

## 2. Current User

### GET `/api/v1/me`

Returns the current nurse user information.

Query parameters:

| Name | Required | Description |
|---|---:|---|
| `userId` | Optional | Current user ID |

---

## 3. Shifts

### GET `/api/v1/shifts`

Returns all available shifts.

### GET `/api/v1/shifts/current`

Returns the current or default shift.

---

## 4. Nurses

### GET `/api/v1/nurses`

Returns all active nurses.

### GET `/api/v1/nurses?shiftId={shiftId}`

Returns nurses for a specific shift.

---

## 5. Nurse Overview

### GET `/api/v1/nurse/overview?shiftId={shiftId}`

Returns nurse overview data for the selected shift, including assigned patients and workload information.

---

## 6. Burden Assessments

### GET `/api/v1/burden-assessments?shiftId={shiftId}&scope={scope}`

Returns burden assessment data.

| Name | Required | Description |
|---|---:|---|
| `shiftId` | Required | Shift ID |
| `scope` | Optional | `mine` or `all` |

### PATCH `/api/v1/burden-assessments/{assessmentId}`

Updates burden assessment data.

---

## 7. Tasks

### GET `/api/v1/tasks?shiftId={shiftId}`

Returns task data for the selected shift.

Optional filters include:

| Name | Description |
|---|---|
| `assignee` | Example: `me` |
| `status` | Example: `pending` |
| `kind` | Task type |

### PATCH `/api/v1/tasks/{taskId}`

Updates a task.

---

## 8. STAT Orders

### GET `/api/v1/stat-orders?shiftId={shiftId}`

Returns STAT orders for the selected shift.

### POST `/api/v1/stat-orders`

Creates a new STAT order.

### PATCH `/api/v1/stat-orders/{orderId}`

Updates a STAT order.

---

## 9. Allocation Runs

### GET `/api/v1/allocation-runs/current?shiftId={shiftId}`

Returns the current allocation run for the selected shift.

### POST `/api/v1/allocation-runs/suggest`

Creates a suggested allocation run.

Example request body:

```json
{
  "shiftId": "00000000-0000-0000-0000-000000000202",
  "targetShiftId": "00000000-0000-0000-0000-000000000203"
}
