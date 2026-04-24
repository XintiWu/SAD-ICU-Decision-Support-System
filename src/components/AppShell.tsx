import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#f7f7f5] text-slate-800">
      <header className="sticky top-0 z-10 border-b border-black/10 bg-[#f2f1ee]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-black text-white">
              ICU
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-wide">ICU 護理分配決策支援系統</div>
            </div>
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            <TopNavLink to="/nurse/overview">護理師首頁</TopNavLink>
            <TopNavLink to="/nurse/handover">交班</TopNavLink>
            <TopNavLink to="/nurse/burden-form">麻煩度填寫</TopNavLink>
            <TopNavLink to="/nurse/todo">TO‑DO</TopNavLink>
            <div className="mx-2 h-5 w-px bg-black/10" />
            <TopNavLink to="/leader/allocation">分床建議</TopNavLink>
            <TopNavLink to="/leader/war-room">戰情室</TopNavLink>
            <TopNavLink to="/reports">報表</TopNavLink>
          </nav>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-black/10">
              白班 06:00–14:00
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-black/10">
              護理師 王小明
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1120px] px-6 py-8">{children}</main>
    </div>
  )
}

function TopNavLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'rounded-full px-3 py-1.5 text-sm font-medium transition',
          isActive
            ? 'bg-black text-white'
            : 'bg-white text-slate-700 ring-1 ring-black/10 hover:bg-black/5',
        ].join(' ')
      }
    >
      {children}
    </NavLink>
  )
}

