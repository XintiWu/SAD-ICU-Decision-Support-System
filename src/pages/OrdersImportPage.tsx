import { useState } from 'react'

export function OrdersImportPage() {
  const [fileName, setFileName] = useState('')

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">醫囑匯入</div>
            <div className="mt-1 text-xs text-slate-600">
              目前此頁提供 demo 用的醫囑匯入入口。正式匯入流程仍需後端解析與任務產生 API 支援。
            </div>
          </div>

          <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-semibold text-[#9a5b1a] ring-1 ring-[#f1d7b8]">
            Demo mode
          </span>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl bg-[#fafaf8] p-5 ring-1 ring-black/5">
            <div className="text-xs font-semibold text-slate-700">上傳醫囑檔案</div>

            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-black/20 bg-white px-6 py-10 text-center hover:bg-black/[0.02]">
              <input
                type="file"
                accept=".csv,.xlsx,.json"
                className="hidden"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
              />
              <div className="text-sm font-semibold text-slate-900">
                {fileName || '選擇 CSV / Excel / JSON 檔案'}
              </div>
              <div className="mt-2 text-xs text-slate-600">
                目前僅作為前端入口展示，尚未送出到後端解析。
              </div>
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled
                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white opacity-40"
              >
                預覽醫囑
              </button>
              <button
                type="button"
                disabled
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 opacity-50 ring-1 ring-black/10"
              >
                產生任務
              </button>
            </div>
          </div>

          <aside className="rounded-2xl bg-white p-5 ring-1 ring-black/10">
            <div className="text-xs font-semibold text-slate-700">目前狀態</div>
            <div className="mt-3 grid gap-3 text-sm">
              <StatusItem label="檔案選擇" value={fileName ? '已選擇' : '尚未選擇'} />
              <StatusItem label="後端解析 API" value="尚未串接" tone="warn" />
              <StatusItem label="任務同步" value="尚未啟用" tone="warn" />
            </div>
          </aside>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
        <div className="text-sm font-semibold text-slate-900">後續實作方向</div>
        <div className="mt-4 grid gap-3 text-sm text-slate-700">
          <Step number="1" text="上傳醫囑檔案，後端解析成標準格式。" />
          <Step number="2" text="將醫囑內容轉成 task / objective burden data。" />
          <Step number="3" text="匯入成功後同步更新 TO-DO、麻煩度填寫與戰情室。" />
        </div>
      </section>
    </div>
  )
}

function StatusItem({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'warn'
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[#fafaf8] px-3 py-2 ring-1 ring-black/5">
      <span className="text-slate-600">{label}</span>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
          tone === 'warn'
            ? 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]'
            : 'bg-[#eaf7ee] text-[#1e6c3a] ring-1 ring-[#b7e0c5]'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-xl bg-[#fafaf8] p-3 ring-1 ring-black/5">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
        {number}
      </div>
      <div>{text}</div>
    </div>
  )
}