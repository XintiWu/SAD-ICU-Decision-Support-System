import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatSnapshotDateTime, saveHandoverSnapshot } from '../state/handoverSnapshotStore'

type Props = {
  className?: string
  variant?: 'primary' | 'secondary'
  showNoteField?: boolean
  showHistoryLink?: boolean
  onSaved?: (id: string) => void
}

export function SaveHandoverSnapshotButton({
  className = '',
  variant = 'primary',
  showNoteField = false,
  showHistoryLink = true,
  onSaved,
}: Props) {
  const navigate = useNavigate()
  const [note, setNote] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function handleSave() {
    if (busy) return
    setBusy(true)
    try {
      const snapshot = saveHandoverSnapshot(note)
      setSavedAt(formatSnapshotDateTime(snapshot.createdAt))
      onSaved?.(snapshot.id)
    } finally {
      setBusy(false)
    }
  }

  const btnClass =
    variant === 'primary'
      ? 'rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90 disabled:opacity-60'
      : 'rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-black/10 hover:bg-black/5 disabled:opacity-60'

  return (
    <div className={['grid gap-2', className].filter(Boolean).join(' ')}>
      {showNoteField ? (
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-slate-600">交班備註（選填）</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例：床 2 待追蹤升壓藥滴速"
            className="w-full rounded-xl bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-black/10 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-black/20"
          />
        </label>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={btnClass} disabled={busy} onClick={handleSave}>
          {busy ? '儲存中…' : '儲存交班快照'}
        </button>
        {showHistoryLink ? (
          <button
            type="button"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-black/10 hover:bg-black/5"
            onClick={() => navigate('/leader/handover-snapshots')}
          >
            查閱歷史快照
          </button>
        ) : null}
        {savedAt ? (
          <span className="rounded-full bg-[#eaf7ee] px-3 py-1 text-xs font-semibold text-[#1e6c3a] ring-1 ring-[#b7e0c5]">
            已儲存 · {savedAt}
          </span>
        ) : null}
      </div>
    </div>
  )
}
