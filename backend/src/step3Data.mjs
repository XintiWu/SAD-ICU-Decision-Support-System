import { currentAssignments, ids } from './step1Data.mjs'

export const allocationRuns = [
  {
    id: '00000000-0000-0000-0000-000000000901',
    shiftId: ids.currentShift,
    targetShiftId: ids.currentShift,
    createdBy: ids.chargeNurse,
    status: 'draft',
    algorithmVersion: 'demo-greedy-v1',
    suggestedAt: '2026-05-08T12:30:00+08:00',
    confirmedAt: null,
  },
]

let allocationItemNo = 0

export const allocationItems = currentAssignments.flatMap((assignment) =>
  assignment.admissionIds.map((admissionId, index) => ({
    id: `00000000-0000-0000-0000-${String(920 + ++allocationItemNo).padStart(12, '0')}`,
    allocationRunId: '00000000-0000-0000-0000-000000000901',
    admissionId,
    nurseId: assignment.nurseId,
    score: 0,
    sortOrder: index + 1,
    isManualOverride: false,
  })),
)
