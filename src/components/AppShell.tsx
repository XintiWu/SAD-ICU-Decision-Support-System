import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useChargeNurseId } from '../hooks/useChargeNurseId'
import { formatShiftOption } from '../lib/shiftLabel'
import { formatNurseDisplay } from '../lib/nurseLabel'
import { useShift } from '../context/ShiftContext'
import { useUser } from '../context/UserContext'

export function AppShell({ children }: { children: ReactNode }) {
  const { shifts, shiftId, selectedShift, setShiftId, loading, error } = useShift()
  const { user, loading: userLoading } = useUser()
  const chargeNurseId = useChargeNurseId()
  const rawName = user?.shortName ?? (userLoading ? '…' : '—')
  const nurse =
    user && rawName !== '…' && rawName !== '—'
      ? formatNurseDisplay(rawName, { nurseId: user.id, chargeNurseId })
      : rawName

  return (
    <div className="min-h-dvh bg-canvas text-slate-800">
      <header className="sticky top-0 z-10 border-b border-[#2D3748] bg-[#1E2533]">
        <div className="mx-auto flex w-full items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#38BDF8] text-xs font-semibold text-[#0F172A]">
              ICU
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-wide text-[#E2E8F0]">ICU 護理分配決策支援系統</div>
            </div>
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            <TopNavLink to="/nurse/overview">護理師首頁</TopNavLink>
            <TopNavLink to="/nurse/burden-form">麻煩度填寫</TopNavLink>
            <TopNavLink to="/nurse/stat">突發性醫囑</TopNavLink>
            <div className="mx-2 h-5 w-px bg-[#2D3748]" />
            <TopNavLink to="/leader/allocation">指派分床配對</TopNavLink>
            <TopNavLink to="/leader/allocation-result">查看分床結果</TopNavLink>
            <TopNavLink to="/leader/war-room">戰情室</TopNavLink>
            <TopNavLink to="/leader/handover-snapshots">交班紀錄</TopNavLink>
          </nav>

          <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
            <label className="sr-only" htmlFor="shift-select">
              班別
            </label>
            <select
              id="shift-select"
              value={shiftId}
              disabled={loading || shifts.length === 0}
              onChange={(e) => setShiftId(e.target.value)}
              className="max-w-[min(100vw-12rem,18rem)] truncate rounded-full border-0 bg-white px-3 py-1 text-xs font-semibold text-[#1E2533] shadow-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/50 disabled:opacity-60"
              title={selectedShift?.label ?? error ?? undefined}
            >
              {loading ? (
                <option value={shiftId}>載入班別…</option>
              ) : shifts.length === 0 ? (
                <option value={shiftId}>無班別資料</option>
              ) : (
                shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatShiftOption(s)}
                  </option>
                ))
              )}
            </select>
            {error && !loading ? (
              <span className="max-w-[14rem] truncate text-[10px] font-medium text-[#fca5a5]" title={error}>
                {error.includes('endpoint') ? '請重啟後端 npm run api:dev' : error}
              </span>
            ) : null}
            <span className="rounded-full bg-[#243047] px-3 py-1 text-xs font-medium text-[#94A3B8]">
              護理師 {nurse}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full px-4 py-5 md:px-8">{children}</main>
    </div>
  )
}

function TopNavLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-[#E2E8F0] text-[#1E2533] active:bg-[#243047] active:text-[#E2E8F0]'
            : 'text-[#94A3B8] hover:text-[#E2E8F0] active:bg-[#E2E8F0] active:text-[#1E2533]',
        ].join(' ')
      }
    >
      {children}
    </NavLink>
  )
}
