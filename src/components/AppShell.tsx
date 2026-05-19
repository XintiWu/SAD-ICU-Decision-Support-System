import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { getCurrentNurseLabel, getCurrentShift } from '../state/demoStore'

export function AppShell({ children }: { children: ReactNode }) {
  const shift = getCurrentShift()
  const shiftLabel = shift === 'day' ? '白班 06:00–14:00' : '—'
  const nurse = getCurrentNurseLabel()
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
            <TopNavLink to="/nurse/stat">STAT 醫囑</TopNavLink>
            <div className="mx-2 h-5 w-px bg-[#2D3748]" />
            <TopNavLink to="/leader/allocation">指派分床配對</TopNavLink>
            <TopNavLink to="/leader/allocation-result">查看分床結果</TopNavLink>
            <TopNavLink to="/leader/war-room">戰情室</TopNavLink>
            <TopNavLink to="/leader/handover-snapshots">交班快照</TopNavLink>
          </nav>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#243047] px-3 py-1 text-xs font-medium text-[#94A3B8]">
              {shiftLabel}
            </span>
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

