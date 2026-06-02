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

export function listShifts({ unitName = 'ICU' } = {}) {
  return shifts
    .filter((item) => item.unitName === unitName)
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
    .map(formatShift)
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
        seniorityLevel: nurse.seniorityLevel ?? null,
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

  const shiftDateStr = new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Taipei'
  }).format(new Date(shift.startsAt)).replace(/\//g, '-')

  const dailyShifts = shifts.filter(s => {
    const sDateStr = new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Taipei'
    }).format(new Date(s.startsAt)).replace(/\//g, '-')
    return sDateStr === shiftDateStr
  })
  
  const dailyRoster = dailyShifts.map(s => {
    const sNurses = shiftNurses
      .filter(sn => sn.shiftId === s.id)
      .map(sn => {
        const n = nurses.find(nurse => nurse.id === sn.nurseId)
        return {
          id: sn.nurseId,
          shortName: n?.shortName ?? '—',
          displayName: n?.displayName ?? '—',
          seniorityLevel: n?.seniorityLevel ?? null,
          role: sn.role
        }
      })
    return {
      id: s.id,
      shiftKey: s.shiftKey,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      status: s.status,
      chargeNurseId: s.chargeNurseId,
      chargeNurseName: nurses.find(n => n.id === s.chargeNurseId)?.shortName ?? '—',
      nurses: sNurses
    }
  })

  return {
    shift: {
      id: shift.id,
      label: shiftLabel(shift),
    },
    onDutyCharge: nurseRef(shift.chargeNurseId),
    myPatients: allPatients.filter((item) => assignedIds.has(item.admissionId)),
    allPatients,
    dailyRoster
  }
}

function ensureShift(shiftId) {
  const shift = shifts.find((item) => item.id === shiftId)
  if (!shift) throw new ApiError(404, 'SHIFT_NOT_FOUND', '找不到指定班別', { shiftId })
  return shift
}

function formatShift(shift) {
  const nurseIds = shiftNurses
    .filter((sn) => sn.shiftId === shift.id)
    .map((sn) => sn.nurseId)
  return {
    id: shift.id,
    shiftKey: shift.shiftKey,
    label: shiftLabel(shift),
    startsAt: shift.startsAt,
    endsAt: shift.endsAt,
    chargeNurse: nurseRef(shift.chargeNurseId),
    status: shift.status,
    nurseIds,
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
  const date = new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Taipei',
  }).format(new Date(shift.startsAt))
  return `${date} ${name} ${hhmm(shift.startsAt)}-${hhmm(shift.endsAt)}`
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

export function importRoster({ startDate, schedule }) {
  const parsedStartDate = new Date(startDate);
  const dayOffsets = {
    '第一天': 0, '第二天': 1, '第三天': 2, '第四天': 3,
    '第五天': 4, '第六天': 5, '第七天': 6
  };
  const shiftKeys = {
    '白班': 'day',
    '小夜班': 'evening',
    '大夜班': 'night'
  };

  const results = [];

  for (const item of schedule) {
    const offset = dayOffsets[item.day];
    if (offset === undefined) continue;
    const shiftKey = shiftKeys[item.shift];
    if (!shiftKey) continue;

    const date = new Date(parsedStartDate);
    date.setDate(date.getDate() + offset);
    const dateStr = date.toISOString().split('T')[0];

    let startsAt, endsAt;
    if (shiftKey === 'day') {
      startsAt = `${dateStr}T07:00:00+08:00`;
      endsAt = `${dateStr}T15:00:00+08:00`;
    } else if (shiftKey === 'evening') {
      startsAt = `${dateStr}T15:00:00+08:00`;
      endsAt = `${dateStr}T23:00:00+08:00`;
    } else {
      startsAt = `${dateStr}T23:00:00+08:00`;
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      const nextDateStr = nextDate.toISOString().split('T')[0];
      endsAt = `${nextDateStr}T07:00:00+08:00`;
    }

    let sRow = shifts.find(s => s.unitName === 'ICU' && s.startsAt === startsAt && s.endsAt === endsAt);
    if (sRow) {
      for (let i = shiftNurses.length - 1; i >= 0; i--) {
        if (shiftNurses[i].shiftId === sRow.id) {
          shiftNurses.splice(i, 1);
        }
      }
    } else {
      sRow = {
        id: `mock-shift-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        unitName: 'ICU',
        shiftKey,
        startsAt,
        endsAt,
        chargeNurseId: null,
        status: 'confirmed'
      };
      shifts.push(sRow);
    }

    const parsedNurses = [];
    for (const [seniorityCat, nurseNames] of Object.entries(item.nurses)) {
      if (!nurseNames || !Array.isArray(nurseNames)) continue;
      for (const name of nurseNames) {
        let n = nurses.find(nurse => nurse.shortName === name.trim());
        if (!n) {
          const newId = `mock-nurse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          n = {
            id: newId,
            displayName: name.trim(),
            shortName: name.trim(),
            seniorityLevel: seniorityCat.includes('1-4年') ? '1-4年' : seniorityCat,
            isActive: true
          };
          nurses.push(n);
          users.push({
            id: newId,
            name: name.trim(),
            role: 'nurse',
            employeeNo: `MOCK_N_${Date.now()}`
          });
        }
        parsedNurses.push({
          id: n.id,
          name: n.shortName,
          seniority: seniorityCat,
          role: users.find(u => u.id === n.id)?.role ?? 'nurse'
        });
      }
    }

    let chargeNurse = parsedNurses.find(n => n.role === 'charge_nurse');
    if (!chargeNurse) {
      const priority = ['15年以上', '10-15年', '4-10年', '1-4年', '1年以下'];
      for (const p of priority) {
        const matched = parsedNurses.filter(n => p.includes(n.seniority) || n.seniority.includes(p));
        if (matched.length > 0) {
          chargeNurse = matched[0];
          break;
        }
      }
    }
    if (!chargeNurse && parsedNurses.length > 0) {
      chargeNurse = parsedNurses[0];
    }

    sRow.chargeNurseId = chargeNurse ? chargeNurse.id : null;

    for (const pn of parsedNurses) {
      shiftNurses.push({
        shiftId: sRow.id,
        nurseId: pn.id,
        role: pn.id === sRow.chargeNurseId ? 'charge_nurse' : 'nurse'
      });
    }

    results.push({
      shiftId: sRow.id,
      date: dateStr,
      shiftKey,
      nurseCount: parsedNurses.length,
      chargeNurseName: chargeNurse ? chargeNurse.name : '—'
    });
  }

  return results;
}

