import {
  admissions,
  beds,
  currentAssignments,
  ids,
  nurses,
  patients,
  shiftNurses,
  shifts,
  users,
} from './step1Data.mjs'

export class ApiError extends Error {
  constructor(status, code, message, details = {}) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export function getCurrentUser(userId = ids.currentNurse) {
  const user = users.find((item) => item.id === userId)
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', '找不到使用者', { userId })

  return {
    id: user.id,
    name: user.name,
    role: user.role,
    currentShiftId: ids.currentShift,
  }
}

export function getCurrentShift(unitName = 'ICU') {
  const shift = shifts.find((item) => item.unitName === unitName && item.status !== 'closed')
  if (!shift) throw new ApiError(404, 'SHIFT_NOT_FOUND', '找不到目前班別', { unitName })
  return formatShift(shift)
}

export function listNurses({ shiftId } = {}) {
  if (shiftId) ensureShift(shiftId)

  const allowedIds = shiftId
    ? new Set(shiftNurses.filter((item) => item.shiftId === shiftId).map((item) => item.nurseId))
    : null

  return nurses
    .filter((nurse) => !allowedIds || allowedIds.has(nurse.id))
    .map((nurse) => {
      const user = users.find((item) => item.id === nurse.id)
      const shiftRole = shiftId ? shiftNurses.find((item) => item.shiftId === shiftId && item.nurseId === nurse.id)?.role : null

      return {
        id: nurse.id,
        displayName: nurse.displayName,
        shortName: nurse.shortName,
        role: shiftRole ?? user?.role ?? 'nurse',
        isActive: nurse.isActive,
      }
    })
}

export function listAdmissions({ shiftId, status = 'active' } = {}) {
  if (shiftId) ensureShift(shiftId)
  if (!['active', 'transferred', 'discharged'].includes(status)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'status 參數不合法', { status })
  }

  return admissions
    .filter((admission) => admission.status === status)
    .map(formatAdmission)
    .sort((a, b) => bedNo(a.bedLabel) - bedNo(b.bedLabel))
}

export function getNurseOverview({ shiftId = ids.currentShift, userId = ids.currentNurse } = {}) {
  const shift = ensureShift(shiftId)
  const currentUser = getCurrentUser(userId)
  const allPatients = listAdmissions({ shiftId, status: 'active' })
  const assignment = currentAssignments.find((item) => item.shiftId === shiftId && item.nurseId === currentUser.id)
  const assignedIds = new Set(assignment?.admissionIds ?? [])

  return {
    shift: {
      id: shift.id,
      label: shiftLabel(shift),
    },
    onDutyCharge: nurseRef(shift.chargeNurseId),
    myPatients: allPatients.filter((item) => assignedIds.has(item.admissionId)),
    allPatients,
  }
}

function ensureShift(shiftId) {
  const shift = shifts.find((item) => item.id === shiftId)
  if (!shift) throw new ApiError(404, 'SHIFT_NOT_FOUND', '找不到指定班別', { shiftId })
  return shift
}

function formatShift(shift) {
  return {
    id: shift.id,
    shiftKey: shift.shiftKey,
    label: shiftLabel(shift),
    startsAt: shift.startsAt,
    endsAt: shift.endsAt,
    chargeNurse: nurseRef(shift.chargeNurseId),
    status: shift.status,
  }
}

function formatAdmission(admission) {
  const patient = patients.find((item) => item.id === admission.patientId)
  const bed = beds.find((item) => item.id === admission.bedId)
  if (!patient || !bed) {
    throw new ApiError(500, 'DATA_INTEGRITY_ERROR', '入院資料缺少病患或床位', {
      admissionId: admission.id,
    })
  }

  return {
    admissionId: admission.id,
    patientId: patient.id,
    bedId: bed.id,
    bedLabel: bed.label,
    patientName: patient.name,
    diagnosis: admission.diagnosis,
    sex: patient.sex,
    age: ageOnDate(patient.birthDate, admission.admittedAt),
    admittedAt: admission.admittedAt,
    attendingPhysician: admission.attendingPhysician,
  }
}

function nurseRef(nurseId) {
  const nurse = nurses.find((item) => item.id === nurseId)
  if (!nurse) throw new ApiError(500, 'DATA_INTEGRITY_ERROR', '找不到班別護理師資料', { nurseId })
  return {
    id: nurse.id,
    shortName: nurse.shortName,
  }
}

function shiftLabel(shift) {
  const name = shift.shiftKey === 'day' ? '白班' : shift.shiftKey === 'evening' ? '小夜班' : '大夜班'
  return `${name} ${hhmm(shift.startsAt)}-${hhmm(shift.endsAt)}`
}

function hhmm(iso) {
  const date = new Date(iso)
  const formatter = new Intl.DateTimeFormat('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Taipei',
  })
  return formatter.format(date)
}

function ageOnDate(birthDate, asOfDate) {
  const birth = new Date(`${birthDate}T00:00:00+08:00`)
  const asOf = new Date(`${asOfDate}T00:00:00+08:00`)
  let age = asOf.getFullYear() - birth.getFullYear()
  const monthDelta = asOf.getMonth() - birth.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && asOf.getDate() < birth.getDate())) age -= 1
  return age
}

function bedNo(label) {
  const match = label.match(/\d+/)
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY
}

