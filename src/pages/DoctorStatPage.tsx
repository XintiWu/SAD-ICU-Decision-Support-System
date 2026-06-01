import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, createStatOrder, importStatOrders, type ApiAdmission, type ApiTask } from '../api/client'
import { useShift } from '../context/useShift'

const KINDS = ['檢查', '治療', '給藥', '監測', '其他'] as const
type Kind = typeof KINDS[number]

export function DoctorStatPage() {
  const { shiftId, selectedShift } = useShift()
  const shiftLabel = selectedShift?.label || ''
  const queryClient = useQueryClient()

  const { data: admissions, isLoading: admissionsLoading } = useQuery({
    queryKey: ['admissions', shiftId],
    queryFn: () => apiGet<ApiAdmission[]>(`/admissions?shiftId=${shiftId}&status=active`),
    enabled: !!shiftId,
  })

  const [admissionId, setAdmissionId] = useState<string>('')
  const [kind, setKind] = useState<Kind>('給藥')
  const [title, setTitle] = useState('')
  const [reason, setReason] = useState('')

  // Query to get active routine tasks/orders for the selected patient
  const { data: patientTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['patient-tasks', shiftId, admissionId],
    queryFn: () => apiGet<ApiTask[]>(`/tasks?shiftId=${shiftId}&admissionId=${admissionId}&assignee=all`),
    enabled: !!shiftId && !!admissionId,
  })

  const mutation = useMutation({
    mutationFn: createStatOrder,
    onSuccess: () => {
      // Invalidate both local cache and global stat orders if needed
      queryClient.invalidateQueries({ queryKey: ['stat-orders'] })
      alert('✅ 突發醫囑發布成功！')
      setTitle('')
      setReason('')
      setAdmissionId('')
    },
    onError: (err: any) => {
      alert(`發布失敗: ${err.message}`)
    }
  })

  const importMutation = useMutation({
    mutationFn: importStatOrders,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stat-orders'] })
      alert('📥 已成功匯入本班所有預設突發事件！護理端將即時觸發通知卡片。')
    },
    onError: (err: any) => {
      alert(`匯入失敗: ${err.message}`)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!admissionId || !title.trim()) {
      alert('請選擇病患並填寫醫囑內容')
      return
    }
    mutation.mutate({
      shiftId,
      admissionId,
      kind,
      title,
      reason,
      orderedBy: '醫師 (模擬)',
    })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">發布突發醫囑 (STAT)</h1>
          <p className="mt-2 text-sm text-slate-500">
            針對目前班別：<span className="font-semibold text-slate-700">{shiftLabel}</span> 發布緊急處置指令。
          </p>
        </div>
      </div>

      {/* Import Predefined STAT Orders Button */}
      <div className="mb-6 rounded-3xl bg-slate-50 border border-slate-100 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800">匯入突發醫囑</h2>
        </div>
        <button
          type="button"
          disabled={importMutation.isPending}
          onClick={() => {
            importMutation.mutate(shiftId)
          }}
          className="shrink-0 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-sm font-bold tracking-wide text-white shadow-lg shadow-emerald-600/20 hover:scale-[1.01] hover:shadow-xl hover:shadow-emerald-600/30 transition-all disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
        >
          {importMutation.isPending ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              匯入中...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              匯入所有突發醫囑
            </>
          )}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5">

        {/* Patient Selection */}
        <div>
          <label htmlFor="patient" className="mb-2 block text-sm font-semibold text-slate-700">
            指定病患 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              id="patient"
              value={admissionId}
              onChange={(e) => setAdmissionId(e.target.value)}
              className="w-full appearance-none rounded-xl border-0 bg-slate-50 px-4 py-3.5 pr-10 text-sm font-medium text-slate-900 ring-1 ring-inset ring-slate-200 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#1e4ea7]"
              disabled={admissionsLoading}
            >
              <option value="" disabled>
                {admissionsLoading ? '載入病患資料中...' : '--- 請選擇住院病患 ---'}
              </option>
              {admissions?.map(a => (
                <option key={a.admissionId} value={a.admissionId}>
                  {a.bedLabel} - {a.patientName} ({a.diagnosis})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
              <svg className="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          {/* Quick Import from Active Routine Orders */}
          {admissionId && (
            <div className="mt-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-[#1e4ea7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  從現有常規醫囑匯入
                </span>
                {tasksLoading && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <svg className="animate-spin h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    載入中...
                  </span>
                )}
              </div>

              {tasksLoading ? (
                <div className="h-12 flex items-center justify-center text-xs text-slate-400">
                  正在搜尋此病患之現行醫囑...
                </div>
              ) : patientTasks && patientTasks.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 max-h-48 overflow-y-auto pr-1">
                  {patientTasks.map((task) => {
                    const kindColors: Record<string, string> = {
                      給藥: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                      檢查: 'bg-indigo-50 text-indigo-700 border-indigo-100',
                      監測: 'bg-sky-50 text-sky-700 border-sky-100',
                      家屬: 'bg-amber-50 text-amber-700 border-amber-100',
                      紀錄: 'bg-slate-100 text-slate-700 border-slate-200',
                    }
                    const badgeClass = kindColors[task.kind] || 'bg-slate-100 text-slate-700 border-slate-200'

                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => {
                          const mappedKind = KINDS.includes(task.kind as any) ? (task.kind as Kind) : '其他'
                          setKind(mappedKind)
                          setTitle(task.title)
                        }}
                        className="group flex flex-col items-start gap-1.5 rounded-xl border border-slate-100 bg-white p-3 text-left transition-all duration-200 hover:border-[#1e4ea7]/30 hover:shadow-sm hover:shadow-[#1e4ea7]/5 hover:scale-[1.01]"
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${badgeClass}`}>
                            {task.kind}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400 group-hover:text-[#1e4ea7] transition-colors flex items-center gap-0.5">
                            點擊匯入
                            <svg className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-slate-700 line-clamp-1 group-hover:text-slate-900">
                          {task.title}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white/50 p-4 text-center text-xs text-slate-400">
                  此病患目前無現有的常規醫囑任務。
                </div>
              )}
            </div>
          )}
        </div>

        {/* Kind Selection */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">醫囑類型</label>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {KINDS.map(k => {
              const isActive = kind === k
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${isActive
                    ? 'bg-[#1e4ea7] text-white shadow-md shadow-[#1e4ea7]/30 ring-2 ring-[#1e4ea7] ring-offset-1'
                    : 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                >
                  {k}
                </button>
              )
            })}
          </div>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="mb-2 block text-sm font-semibold text-slate-700">
            醫囑內容 <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：STAT CT Scan、輸血 2U..."
            className="w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:font-normal placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#1e4ea7]"
          />
        </div>

        {/* Reason */}
        <div>
          <label htmlFor="reason" className="mb-2 block text-sm font-semibold text-slate-700">
            原因與備註 (選填)
          </label>
          <textarea
            id="reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="說明為什麼需要此突發醫囑，讓護理師了解狀況..."
            className="w-full resize-none rounded-xl border-0 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:font-normal placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#1e4ea7]"
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1e4ea7] to-[#163a7d] px-4 py-4 text-sm font-bold tracking-wide text-white shadow-lg shadow-[#1e4ea7]/30 transition-all hover:scale-[1.01] hover:shadow-xl hover:shadow-[#1e4ea7]/40 disabled:pointer-events-none disabled:opacity-50"
          >
            {mutation.isPending ? (
              <>
                <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                發布中...
              </>
            ) : (
              '發布突發醫囑'
            )}
          </button>
        </div>

      </form>
    </div>
  )
}
