import { useState, useEffect, useRef, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useChargeNurseId } from '../hooks/useChargeNurseId'
import { formatShiftOption } from '../lib/shiftLabel'
import { formatNurseDisplay } from '../lib/nurseLabel'
import { useShift } from '../context/useShift'
import { useUser } from '../context/useUser'

export function AppShell({ children }: { children: ReactNode }) {
  const { shifts, shiftId, selectedShift, setShiftId, loading, error } = useShift()
  const { user, loading: userLoading } = useUser()
  const chargeNurseId = useChargeNurseId()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

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
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                id="shift-select"
                disabled={loading || shifts.length === 0}
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center justify-between gap-2 max-w-[min(100vw-12rem,18rem)] truncate rounded-full border-0 bg-white px-3.5 py-1 text-xs font-semibold text-[#1E2533] shadow-sm ring-1 ring-black/10 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/50 disabled:opacity-60 cursor-pointer active:scale-[0.98] transition-all"
                title={selectedShift?.label ?? error ?? undefined}
              >
                <span className="truncate">
                  {loading
                    ? '載入班別…'
                    : shifts.length === 0
                    ? '無班別資料'
                    : selectedShift
                    ? formatShiftOption(selectedShift)
                    : '選擇班別'}
                </span>
                <span className="text-[10px] text-slate-500" aria-hidden="true">▼</span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white text-slate-800 shadow-xl ring-1 ring-black/10 z-50 p-2 py-1.5 max-h-80 overflow-y-auto">
                  {shifts.map((s) => {
                    const isSelected = s.id === shiftId
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setShiftId(s.id)
                          setDropdownOpen(false)
                        }}
                        className={[
                          'w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold rounded-xl transition-colors cursor-pointer',
                          isSelected
                            ? 'bg-[#E6F4EA] text-[#1E6C3A]'
                            : 'hover:bg-slate-100 text-slate-700',
                        ].join(' ')}
                      >
                        {isSelected ? (
                          <span className="text-sm font-extrabold text-[#1E6C3A]">✓</span>
                        ) : (
                          <span className="w-3" />
                        )}
                        <span className="truncate">{formatShiftOption(s)}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
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
