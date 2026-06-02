import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'
import * as XLSX from 'xlsx'
import { apiPost } from '../api/client'

type SeniorityGroups = {
  '15年以上': string[]
  '10-15年': string[]
  '4-10年': string[]
  '1-4年': string[]
  '1年以下': string[]
}

type RosterItem = {
  day: string
  shift: string
  totalCount: number
  nurses: SeniorityGroups
}

export function RosterImportPage() {
  const [startDate, setStartDate] = useState('2026-05-19')
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<RosterItem[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true)
    } else if (e.type === 'dragleave') {
      setIsDragActive(false)
    }
  }

  const parseFile = (file: File) => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 })

        const schedule: RosterItem[] = []
        let currentDay = ''

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          if (!row || row.length === 0) continue
          const firstVal = row[0]
          if (typeof firstVal === 'string' && firstVal.trim().endsWith('天')) {
            currentDay = firstVal.trim()
            continue
          }
          if (firstVal === '班別') {
            continue
          }
          if (['白班', '小夜班', '大夜班'].includes(firstVal)) {
            const shiftName = firstVal
            const totalCount = Number(row[1] ?? 0)

            const parseNurses = (cellVal: any) => {
              if (!cellVal) return []
              return String(cellVal)
                .split(/[、,，]/)
                .map((n) => n.trim())
                .filter(Boolean)
            }

            schedule.push({
              day: currentDay,
              shift: shiftName,
              totalCount,
              nurses: {
                '15年以上': parseNurses(row[2]),
                '10-15年': parseNurses(row[3]),
                '4-10年': parseNurses(row[4]),
                '1-4年': parseNurses(row[5]),
                '1年以下': parseNurses(row[6]),
              },
            })
          }
        }

        if (schedule.length === 0) {
          throw new Error('Excel 格式不符，找不到可解析的班表資料。')
        }

        setParsedData(schedule)
        setFile(file)
      } catch (err) {
        setError(err instanceof Error ? err.message : '解析 Excel 檔案失敗')
        setParsedData([])
      } finally {
        setLoading(false)
      }
    }
    reader.onerror = () => {
      setError('讀取檔案失敗')
      setLoading(false)
    }
    reader.readAsArrayBuffer(file)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseFile(e.target.files[0])
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const handleImport = async () => {
    if (parsedData.length === 0) return
    setImporting(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await apiPost<{ shiftId: string; date: string; shiftKey: string; nurseCount: number }[]>(
        '/roster/import',
        {
          startDate,
          schedule: parsedData,
        }
      )
      setSuccess(`成功匯入 7 天共 ${response.length} 個班別！資料已寫入資料庫。`)
      setFile(null)
      setParsedData([])
    } catch (err) {
      setError(err instanceof Error ? err.message : '匯入班表失敗，請重試')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">匯入護理師班表</h1>
          <p className="text-sm text-slate-600">上傳 ICU 護理師 7 日排班表 Excel 檔案，建立並分配當班護理師與組長。</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Combined Card: Date Settings & Instructions */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 md:col-span-2 flex flex-col md:flex-row gap-6 md:divide-x divide-slate-100">
          {/* Date Settings */}
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-slate-900">設定匯入日期</h2>
            <p className="mt-1 text-xs text-slate-500">班表第一天所對應的實際日期</p>
            <div className="mt-4">
              <label htmlFor="start-date" className="block text-xs font-semibold text-slate-700">第一天日期</label>
              <input
                type="date"
                id="start-date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1.5 w-full max-w-xs rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-medium focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Import instructions */}
          <div className="flex-1 md:pl-6 pt-6 md:pt-0 border-t md:border-t-0 border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">匯入說明</h2>
            <ul className="mt-3 list-inside list-disc text-xs leading-relaxed text-slate-600 space-y-1.5">
              <li>系統會自動註冊名單中不存在的護理師。</li>
              <li>自動判定各班的小組長（ charge nurse ）角色。</li>
            </ul>
          </div>
        </div>

        {/* Upload area */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all ${isDragActive
              ? 'border-indigo-500 bg-indigo-50/50'
              : 'border-slate-300 hover:border-indigo-400 bg-white shadow-sm hover:shadow-md'
            }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls"
            className="hidden"
          />
          <div className="rounded-full bg-slate-50 p-2.5 ring-4 ring-slate-100 text-xl">
            📂
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-900">
            {file ? file.name : '點擊或拖入護理師班表 Excel 檔案'}
          </p>
          <p className="mt-1 text-[10px] text-slate-500">支援 .xlsx, .xls 檔案格式</p>
        </div>
      </div>

      {/* Feedback Alerts */}
      {(error || success || loading) && (
        <div className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
              <span className="font-semibold">錯誤：</span> {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-200">
              <span className="font-semibold">成功：</span> {success}
            </div>
          )}
          {loading && (
            <div className="flex items-center justify-center p-6 text-sm text-slate-500">
              <span className="animate-spin text-lg mr-2">⚙️</span>
              解析檔案中...
            </div>
          )}
        </div>
      )}

      {/* Preview Section */}
      {parsedData.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-black/5 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">班表預覽</h3>
              <p className="text-xs text-slate-500">解析出 7 天排班。請核對下方排班配置，確認無誤後點擊右側匯入。</p>
            </div>
            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              className="rounded-full bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer disabled:opacity-60 active:scale-[0.98] transition-all"
            >
              {importing ? '匯入中...' : '確認匯入'}
            </button>
          </div>

          <div className="space-y-8">
            {Array.from(new Set(parsedData.map((d) => d.day))).map((dayName) => {
              const dayShifts = parsedData.filter((d) => d.day === dayName)
              return (
                <div key={dayName} className="space-y-3">
                  {/* Day Header */}
                  <h4 className="text-base font-bold text-slate-900 px-1 flex items-center gap-2">
                    <span className="h-4.5 w-1.5 rounded-full bg-indigo-600" />
                    {dayName}
                  </h4>

                  {/* Excel-like Modern Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                    <table className="min-w-full divide-y divide-slate-200 text-left border-collapse">
                      <thead className="bg-slate-50/75">
                        <tr>
                          <th scope="col" className="w-24 px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200/80">班別</th>
                          <th scope="col" className="w-20 px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200/80 text-center">總人數</th>
                          <th scope="col" className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200/80">15年以上</th>
                          <th scope="col" className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200/80">10-15年</th>
                          <th scope="col" className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200/80">4-10年</th>
                          <th scope="col" className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200/80">1-4年</th>
                          <th scope="col" className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">1年以下</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {dayShifts.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-slate-900 border-r border-slate-200/80">{item.shift}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-600 border-r border-slate-200/80 text-center">{item.totalCount}</td>
                            <td className="px-4 py-3 text-sm text-slate-700 font-medium border-r border-slate-200/80">{item.nurses['15年以上']?.join('、') || '-'}</td>
                            <td className="px-4 py-3 text-sm text-slate-700 font-medium border-r border-slate-200/80">{item.nurses['10-15年']?.join('、') || '-'}</td>
                            <td className="px-4 py-3 text-sm text-slate-700 font-medium border-r border-slate-200/80">{item.nurses['4-10年']?.join('、') || '-'}</td>
                            <td className="px-4 py-3 text-sm text-slate-700 font-medium border-r border-slate-200/80">{item.nurses['1-4年']?.join('、') || '-'}</td>
                            <td className="px-4 py-3 text-sm text-slate-700 font-medium">{item.nurses['1年以下']?.join('、') || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
