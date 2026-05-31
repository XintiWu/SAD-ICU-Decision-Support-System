import { Link } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { apiGet, apiPatch, CURRENT_NURSE_USER_ID, type ApiTask, type WarRoomData } from '../api/client'
import { useChargeNurseId } from '../hooks/useChargeNurseId'
import { formatNurseDisplay } from '../lib/nurseLabel'
import { useShift } from '../context/ShiftContext'

type WarRoomTask = {
  id: string
  ownerNurseId: string
  admissionId: string
  bedLabel: string
  title: string
  urgent: boolean
  done: boolean
  stat: boolean
  newbie: boolean
  points: number
}

type PatientInfo = {
  admissionId: string
  bed: string
  bedLabel: string
  patient: string
  diagnosis: string
  score: number
  tone: 'high' | 'mid' | 'low'
}

type NurseCardModel = {
  nurseId: string
  name: string
  remaining: number
  tone: 'high' | 'mid' | 'low'
  patients: PatientInfo[]
  tasks: WarRoomTask[]
}

export function WarRoomPage() {
  const { shiftId, selectedShift } = useShift()
  const chargeNurseId = useChargeNurseId()
  const actorId = chargeNurseId ?? CURRENT_NURSE_USER_ID
  const [data, setData] = useState<WarRoomData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingKey, setTogglingKey] = useState<string | null>(null)
  const togglingRef = useRef(false)
  const suppressPollUntilRef = useRef(0)
  const [detailPatient, setDetailPatient] = useState<{
    nurseId: string
    nurseName: string
    patient: PatientInfo
    tasks: WarRoomTask[]
  } | null>(null)

  const load = useCallback((opts?: { initial?: boolean }) => {
    if (!opts?.initial) {
      if (togglingRef.current) return Promise.resolve()
      if (Date.now() < suppressPollUntilRef.current) return Promise.resolve()
    }
    return apiGet<WarRoomData>(`/war-room?shiftId=${shiftId}`)
      .then((nextData) => {
        setData((prev) => (prev && !opts?.initial ? mergeWarRoomData(prev, nextData) : nextData))
        setError(null)
      })
      .catch((err: Error) => setError(err.message))
  }, [shiftId])

  useEffect(() => {
    suppressPollUntilRef.current = 0
  }, [shiftId])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setData(null)

    load({ initial: true })
      .finally(() => {
        if (alive) setLoading(false)
      })

    const timer = window.setInterval(() => {
      if (alive && !togglingRef.current && Date.now() >= suppressPollUntilRef.current) load()
    }, 5000)

    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [load])

  const handleTaskToggle = useCallback(
    async (cardNurseId: string, task: WarRoomTask) => {
      const ownerNurseId = task.ownerNurseId
      if (ownerNurseId !== cardNurseId) return

      const toggleKey = taskToggleKey(ownerNurseId, task.id)
      if (togglingRef.current) return

      const prevDone = task.done
      const nextDone = !prevDone
      togglingRef.current = true
      suppressPollUntilRef.current = Date.now() + 10000
      setTogglingKey(toggleKey)
      setData((prev) => (prev ? patchTaskDoneInData(prev, ownerNurseId, task.id, nextDone) : prev))

      try {
        const nextStatus = nextDone ? 'done' : 'pending'
        if (task.stat) {
          const orderId = task.id.startsWith('stat:') ? task.id.slice(5) : task.id
          await apiPatch(`/stat-orders/${orderId}`, { status: nextStatus }, { userId: actorId })
        } else {
          await apiPatch(`/tasks/${task.id}`, { status: nextStatus }, { userId: actorId })
        }
      } catch (err) {
        setData((prev) => (prev ? patchTaskDoneInData(prev, ownerNurseId, task.id, prevDone) : prev))
        setError(err instanceof Error ? err.message : '更新失敗')
      } finally {
        togglingRef.current = false
        setTogglingKey(null)
      }
    },
    [actorId],
  )

  const nurses: NurseCardModel[] = useMemo(() => {
    return (data?.nurses ?? []).map((row) => toNurseCard(row, chargeNurseId))
  }, [data, chargeNurseId])

  if (loading) return <div className="rounded-2xl bg-white p-5 text-sm font-semibold text-slate-700 ring-1 ring-black/10">載入戰情室...</div>
  if (error && !data) return <div className="rounded-2xl bg-[#ffe8e1] p-5 text-sm font-semibold text-[#b3341f] ring-1 ring-[#f2b3a6]">{error}</div>

  const totalTasks = nurses.reduce((acc, n) => acc + n.tasks.length, 0)
  const doneTasks = nurses.reduce((acc, n) => acc + n.tasks.filter((t) => t.done).length, 0)
  const urgentTasks = nurses.reduce((acc, n) => acc + n.tasks.filter((t) => t.urgent && !t.done).length, 0)
  const highCount = nurses.filter((n) => n.tone === 'high').length
  const midCount = nurses.filter((n) => n.tone === 'mid').length
  const lowCount = nurses.filter((n) => n.tone === 'low').length

  return (
    <div className="grid gap-4">
      {error ? (
        <div className="rounded-xl bg-[#fff7ed] px-4 py-2 text-xs font-semibold text-[#9a5b1a] ring-1 ring-[#f1d7b8]">{error}</div>
      ) : null}

      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#eef2ff] via-[#f5fbff] to-[#ecfeff] ring-1 ring-black/10 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_0_0_1px_rgba(2,6,23,0.04)_inset]">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#1d4ed8] via-[#0ea5e9] to-[#14b8a6]" />
        <div className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold tracking-wide text-slate-600">全體概況 OVERVIEW</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">重點指標（完成 / 急件 / 負擔）</div>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full bg-white px-3 py-1.5 font-semibold text-slate-800 ring-1 ring-black/10">
                護理師 <span className="ml-1 text-sm font-extrabold text-slate-900">{nurses.length}</span>
              </span>
              <span className="rounded-full bg-white px-3 py-1.5 font-semibold text-slate-800 ring-1 ring-black/10">
                總任務 <span className="ml-1 text-sm font-extrabold text-slate-900">{totalTasks}</span>
              </span>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <OverviewKpi label="已完成" value={`${doneTasks}`} hint={`${Math.round((doneTasks / Math.max(1, totalTasks)) * 100)}%`} tone="ok" />
            <OverviewKpi label="未完成" value={`${Math.max(0, totalTasks - doneTasks)}`} hint="待處理" tone="mid" />
            <OverviewKpi label="急件" value={`${urgentTasks}`} hint="未完成急件" tone={urgentTasks ? 'danger' : 'ok'} />
            <OverviewKpi
              label="負擔分布"
              value={`${highCount}/${midCount}/${lowCount}`}
              hint="高/中/低"
              tone={highCount ? 'danger' : midCount ? 'mid' : 'ok'}
            />
          </div>
        </div>
      </div>

      <section className="rounded-2xl bg-white p-3 ring-1 ring-black/10">
        {nurses.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [&>*]:min-w-0">
            {nurses.map((n) => (
              <NurseLoadCard
                key={n.nurseId}
                nurseId={n.nurseId}
                name={n.name}
                remaining={n.remaining}
                tone={n.tone}
                patients={n.patients}
                tasks={n.tasks}
                togglingKey={togglingKey}
                onTaskToggle={(task) => handleTaskToggle(n.nurseId, task)}
                onPatientDetail={(patient) =>
                  setDetailPatient({
                    nurseId: n.nurseId,
                    nurseName: n.name,
                    patient,
                    tasks: n.tasks.filter((t) => t.admissionId === patient.admissionId),
                  })
                }
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-[#fafaf8] px-5 py-8 text-center ring-1 ring-black/10">
            <div className="text-sm font-semibold text-slate-900">此班別尚無戰情資料</div>
            {selectedShift ? (
              <p className="mt-1 text-sm text-slate-600">{selectedShift.label}</p>
            ) : null}
            <p className="mt-3 text-sm text-slate-600">
              戰情室需有<strong className="font-semibold text-slate-800">已確認分床</strong>才能將 STAT／任務對應到護理師。請至{' '}
              <Link to="/leader/allocation" className="font-semibold text-[#1e4ea7] underline underline-offset-2">
                指派分床配對
              </Link>{' '}
              完成確認，或切換至已有分床的班別（例如 2026/05/20 小夜班）。
            </p>
            {data?.overview.totalTasks ? (
              <p className="mt-2 text-xs text-slate-500">
                此班別有 {data.overview.totalTasks} 筆任務／STAT，但尚未對應到分床結果。
              </p>
            ) : null}
          </div>
        )}
      </section>

      {detailPatient ? (
        <PatientDetailModal
          nurseId={detailPatient.nurseId}
          nurseName={detailPatient.nurseName}
          patient={detailPatient.patient}
          tasks={detailPatient.tasks}
          togglingKey={togglingKey}
          onClose={() => setDetailPatient(null)}
          onTaskToggle={(task) => handleTaskToggle(detailPatient.nurseId, task)}
        />
      ) : null}
    </div>
  )
}

function patchTaskDoneInData(data: WarRoomData, nurseId: string, taskId: string, done: boolean): WarRoomData {
  const status = done ? ('done' as const) : ('pending' as const)
  const nurses = data.nurses.map((nurse) => {
    if (nurse.nurseId !== nurseId) return nurse
    const tasks = nurse.tasks.map((task) =>
      task.id !== taskId
        ? task
        : {
            ...task,
            done,
            status,
            completedAt: done ? (task.completedAt ?? new Date().toISOString()) : null,
          },
    )
    const remaining = tasks.filter((t) => !t.done).reduce((sum, t) => sum + t.points, 0)
    return { ...nurse, tasks, remaining }
  })
  return { ...data, nurses, overview: recalculateOverview(nurses) }
}

function recalculateOverview(nurses: WarRoomData['nurses']): WarRoomData['overview'] {
  const allTasks = nurses.flatMap((n) => n.tasks)
  const openTasks = allTasks.filter((t) => !t.done)
  const activeNurses = nurses.filter((n) => n.patients.length > 0 || n.tasks.length > 0)
  return {
    nurseCount: activeNurses.length,
    totalTasks: allTasks.length,
    doneTasks: allTasks.filter((t) => t.done).length,
    pendingTasks: openTasks.length,
    urgentOpenTasks: openTasks.filter((t) => t.urgent).length,
  }
}

function mergeWarRoomData(prev: WarRoomData, next: WarRoomData): WarRoomData {
  const prevNurseOrder = prev.nurses.map((n) => n.nurseId)
  const nextByNurseId = new Map(next.nurses.map((n) => [n.nurseId, n]))
  const orderedNurses = prevNurseOrder
    .map((id) => nextByNurseId.get(id))
    .filter((n): n is WarRoomData['nurses'][number] => Boolean(n))
  const newNurses = next.nurses.filter((n) => !prevNurseOrder.includes(n.nurseId))
  const nurses = [...orderedNurses, ...newNurses].map((nurse) => {
    const prevNurse = prev.nurses.find((p) => p.nurseId === nurse.nurseId)
    if (!prevNurse) return nurse
    const prevTaskOrder = prevNurse.tasks.map((t) => t.id)
    const nextTasksById = new Map(nurse.tasks.map((t) => [t.id, t]))
    const orderedTasks = prevTaskOrder
      .map((id) => nextTasksById.get(id))
      .filter((t): t is ApiTask => Boolean(t))
    const newTasks = nurse.tasks.filter((t) => !prevTaskOrder.includes(t.id))
    return { ...nurse, tasks: [...orderedTasks, ...newTasks] }
  })
  return { ...next, nurses, overview: recalculateOverview(nurses) }
}

function toNurseCard(row: WarRoomData['nurses'][number], chargeNurseId: string | null): NurseCardModel {
  const patients: PatientInfo[] = row.patients.map((patient) => ({
    admissionId: patient.admissionId,
    bed: bedNo(patient.bedLabel),
    bedLabel: patient.bedLabel,
    patient: patient.patientName,
    diagnosis: patient.diagnosis,
    score: patient.score,
    tone: patient.tone,
  }))
  const maxScore = row.patients.reduce((max, patient) => Math.max(max, patient.score), 0)
  const displayName = formatNurseDisplay(row.shortName, { nurseId: row.nurseId, chargeNurseId })
  const tasks = row.tasks
    .filter((task) => (task.assignedNurseId ?? row.nurseId) === row.nurseId)
    .map((task) => {
      const ownerNurseId = task.assignedNurseId ?? row.nurseId
      return {
        id: task.id,
        ownerNurseId,
        admissionId: task.admissionId,
        bedLabel: task.bedLabel,
        title: task.title,
        urgent: task.urgent,
        done: task.done,
        stat: task.source === 'STAT',
        newbie: task.source === '新病人',
        points: task.points,
      }
    })
  const remainingFromTasks = tasks.filter((task) => !task.done).reduce((sum, task) => sum + task.points, 0)

  return {
    nurseId: row.nurseId,
    name: `護理師 ${displayName}`,
    remaining: remainingFromTasks,
    tone: maxScore >= 22 || remainingFromTasks >= 16 ? 'high' : maxScore >= 14 || remainingFromTasks >= 9 ? 'mid' : 'low',
    patients,
    tasks,
  }
}

function taskToggleKey(nurseId: string, taskId: string) {
  return `${nurseId}::${taskId}`
}

function burdenToneLabel(tone: 'high' | 'mid' | 'low') {
  return tone === 'high' ? '高' : tone === 'mid' ? '中' : '低'
}

function bedNo(label: string) {
  const match = label.match(/\d+/)
  return match ? match[0] : label
}

function formatTaskBedLabel(label: string) {
  const num = label.match(/\d+/)
  return num ? `床${num[0]}` : label
}

function sortTasks(tasks: WarRoomTask[]) {
  return tasks.slice().sort((a, b) => {
    if (a.done !== b.done) return Number(a.done) - Number(b.done)
    const bed = a.bedLabel.localeCompare(b.bedLabel, 'zh-Hant')
    if (bed !== 0) return bed
    const title = a.title.localeCompare(b.title, 'zh-Hant')
    if (title !== 0) return title
    return a.id.localeCompare(b.id)
  })
}

function NurseLoadCard({
  nurseId,
  name,
  remaining,
  tone,
  patients,
  tasks,
  togglingKey,
  onTaskToggle,
  onPatientDetail,
}: {
  nurseId: string
  name: string
  remaining: number
  tone: 'high' | 'mid' | 'low'
  patients: PatientInfo[]
  tasks: WarRoomTask[]
  togglingKey: string | null
  onTaskToggle: (task: WarRoomTask) => void
  onPatientDetail: (patient: PatientInfo) => void
}) {
  const bar = tone === 'high' ? 'bg-[#c64a2c]' : tone === 'mid' ? 'bg-[#d88b2c]' : 'bg-[#2f7a44]'
  const pill =
    tone === 'high'
      ? 'bg-[#ffe8e1] text-[#b3341f] ring-1 ring-[#f2b3a6]'
      : tone === 'mid'
        ? 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]'
        : 'bg-[#eaf7ee] text-[#1e6c3a] ring-1 ring-[#b7e0c5]'

  const pct = Math.min(100, Math.round((remaining / 25) * 100))
  const doneCount = tasks.filter((t) => t.done).length
  const totalCount = tasks.length
  const urgentOpen = tasks.filter((t) => t.urgent && !t.done).length
  const burdenLabel = tone === 'high' ? '高' : tone === 'mid' ? '中' : '低'
  const sortedTasks = useMemo(() => sortTasks(tasks), [tasks])

  const pendingByAdmission = useMemo(() => {
    const map = new Map<string, number>()
    for (const task of tasks) {
      if (task.done) continue
      map.set(task.admissionId, (map.get(task.admissionId) ?? 0) + 1)
    }
    return map
  }, [tasks])

  return (
    <section className="flex min-w-0 flex-col rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/10">
      <div className="mb-2 h-2 overflow-hidden rounded-full bg-black/5">
        <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">{name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
            <span className="rounded-full bg-white px-2.5 py-0.5 font-semibold text-slate-700 ring-1 ring-black/10">
              完成 {doneCount}/{totalCount}
            </span>
            {urgentOpen ? (
              <span className="rounded-full bg-[#ffe8e1] px-2.5 py-0.5 font-semibold text-[#b3341f] ring-1 ring-[#f2b3a6]">
                急件 {urgentOpen}
              </span>
            ) : null}
            <span className={`rounded-full px-2.5 py-0.5 font-semibold ${pill}`}>負擔 {burdenLabel}</span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[11px] font-semibold text-slate-500">剩餘</div>
          <div className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900">{remaining}</div>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {patients.length ? (
          <div className="flex flex-wrap gap-1.5">
            {patients.map((patient) => {
              const pending = pendingByAdmission.get(patient.admissionId) ?? 0
              return (
                <button
                  key={patient.admissionId}
                  type="button"
                  onClick={() => onPatientDetail(patient)}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#f8fafc] px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-black/10 transition hover:bg-white hover:ring-[#1d4ed8]/30"
                  title={`${patient.patient} · ${patient.diagnosis}`}
                >
                  <span className="truncate">床 {patient.bed}</span>
                  {pending ? (
                    <span className="shrink-0 rounded-full bg-[#ffe8e1] px-1.5 py-px text-[10px] font-bold text-[#b3341f]">{pending}</span>
                  ) : null}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl bg-[#fafaf8] px-3 py-2 text-[11px] font-semibold text-slate-600 ring-1 ring-black/10">尚無分配床位</div>
        )}

        <ul className="flex max-h-52 flex-col gap-1.5 overflow-y-auto rounded-xl bg-[#fafaf8] p-1.5 ring-1 ring-black/5">
          {sortedTasks.length ? (
            sortedTasks.map((task) => (
              <TaskRow
                key={taskToggleKey(nurseId, task.id)}
                inputId={taskToggleKey(nurseId, task.id)}
                task={task}
                disabled={togglingKey === taskToggleKey(nurseId, task.id)}
                onToggle={() => onTaskToggle(task)}
              />
            ))
          ) : (
            <li className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-black/10">目前沒有未完成任務</li>
          )}
        </ul>
      </div>
    </section>
  )
}

function TaskRow({
  inputId,
  task,
  disabled,
  onToggle,
}: {
  inputId: string
  task: WarRoomTask
  disabled: boolean
  onToggle: () => void
}) {
  return (
    <li
      className={[
        'flex items-start justify-between gap-2.5 rounded-lg px-2.5 py-2',
        task.done ? 'border border-slate-200 bg-slate-50/80' : 'bg-white',
        !task.done && task.urgent ? 'border border-[#f2b3a6]' : !task.done ? 'border border-black/10' : '',
        disabled ? 'opacity-60' : '',
      ].join(' ')}
    >
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className={`break-words text-xs font-semibold leading-snug ${task.done ? 'text-slate-400 line-through decoration-slate-400' : 'text-slate-900'}`}>
          <span className={`mr-1.5 text-[10px] font-bold tracking-wide ${task.done ? 'text-slate-400' : 'text-slate-500'}`}>{formatTaskBedLabel(task.bedLabel)}</span>
          {task.title}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
          {task.stat && !task.done ? <span className="rounded-full bg-red-100 px-2 py-0.5 font-bold text-red-800">STAT</span> : null}
          {task.urgent && !task.stat && !task.done ? <span className="rounded-full bg-[#ffe8e1] px-2 py-0.5 font-semibold text-[#b3341f]">急</span> : null}
          {task.newbie ? <span className="rounded-full bg-[#fff7ed] px-2 py-0.5 font-semibold text-[#9a5b1a]">新人</span> : null}
          <span className={task.done ? 'font-semibold text-[#1e6c3a]' : 'text-slate-500'}>{task.done ? '已完成' : '待處理'}</span>
        </div>
      </div>
      <input
        id={inputId}
        type="checkbox"
        checked={task.done}
        disabled={disabled}
        onChange={onToggle}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#1d4ed8] disabled:cursor-wait"
        aria-label={task.done ? '標記為未完成' : '標記為完成'}
      />
    </li>
  )
}

function PatientDetailModal({
  nurseId,
  nurseName,
  patient,
  tasks,
  togglingKey,
  onClose,
  onTaskToggle,
}: {
  nurseId: string
  nurseName: string
  patient: PatientInfo
  tasks: WarRoomTask[]
  togglingKey: string | null
  onClose: () => void
  onTaskToggle: (task: WarRoomTask) => void
}) {
  const tonePill =
    patient.tone === 'high'
      ? 'bg-[#ffe8e1] text-[#b3341f] ring-[#f2b3a6]'
      : patient.tone === 'mid'
        ? 'bg-[#fff7ed] text-[#9a5b1a] ring-[#f1d7b8]'
        : 'bg-[#eaf7ee] text-[#1e6c3a] ring-[#b7e0c5]'

  const sortedTasks = sortTasks(tasks)
  const openCount = tasks.filter((t) => !t.done).length

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="patient-detail-title">
      <button type="button" className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]" onClick={onClose} aria-label="關閉" />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/10">
        <div className="border-b border-black/10 bg-gradient-to-r from-[#eef2ff] to-white px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div id="patient-detail-title" className="text-base font-extrabold tracking-tight text-slate-900">
                床 {patient.bed} · {patient.patient}
              </div>
              <div className="mt-0.5 text-xs font-medium text-slate-600">{nurseName}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-black/10 hover:bg-slate-50"
            >
              關閉
            </button>
          </div>
        </div>

        <div className="grid gap-3 p-4">
          <div className="grid gap-2 rounded-xl bg-[#fafaf8] p-3 ring-1 ring-black/10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500">床位編號</span>
              <span className="text-sm font-bold text-slate-900">{patient.bedLabel}</span>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">診斷</div>
              <div className="mt-0.5 text-sm leading-snug text-slate-800">{patient.diagnosis}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500">麻煩度</span>
              <span className="text-sm font-extrabold text-slate-900">{patient.score}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${tonePill}`}>
                {burdenToneLabel(patient.tone)}
              </span>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-xs font-extrabold tracking-wide text-slate-900">任務清單</div>
              <span className="text-[11px] font-semibold text-slate-500">待處理 {openCount}</span>
            </div>
            <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto rounded-xl bg-[#fafaf8] p-1.5 ring-1 ring-black/5">
              {sortedTasks.length ? (
                sortedTasks.map((task) => (
                  <TaskRow
                    key={taskToggleKey(nurseId, task.id)}
                    inputId={`modal-${taskToggleKey(nurseId, task.id)}`}
                    task={task}
                    disabled={togglingKey === taskToggleKey(nurseId, task.id)}
                    onToggle={() => onTaskToggle(task)}
                  />
                ))
              ) : (
                <li className="rounded-xl bg-[#fafaf8] px-3 py-2 text-xs text-slate-600 ring-1 ring-black/10">此病患目前無任務</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function OverviewKpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint: string
  tone: 'ok' | 'mid' | 'danger'
}) {
  const pill =
    tone === 'danger'
      ? 'bg-[#ffe8e1] text-[#b3341f] ring-1 ring-[#f2b3a6]'
      : tone === 'mid'
        ? 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]'
        : 'bg-[#eaf7ee] text-[#1e6c3a] ring-1 ring-[#b7e0c5]'

  return (
    <div className="rounded-2xl bg-white px-3 py-2 ring-1 ring-black/10">
      <div className="text-[11px] font-semibold text-slate-600">{label}</div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="text-2xl font-extrabold tracking-tight text-slate-900">{value}</div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${pill}`}>{hint}</span>
      </div>
    </div>
  )
}
