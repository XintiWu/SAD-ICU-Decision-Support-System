import { useEffect, useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, type ApiStatOrder } from '../api/client'
import { useShift } from '../context/useShift'
import { useNavigate, useLocation } from 'react-router-dom'

type ToastProps = {
  order: ApiStatOrder
  onDismiss: () => void
}

function StatToast({ order, onDismiss }: ToastProps) {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss()
    }, 10000) // auto dismiss after 10s
    return () => clearTimeout(timer)
  }, [onDismiss])

  const handleClick = () => {
    navigate('/nurse/stat')
    onDismiss()
  }

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer pointer-events-auto w-full max-w-sm transform overflow-hidden rounded-2xl bg-white/80 p-4 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl transition-all duration-500 hover:scale-[1.02]"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#b3341f] to-[#7f1d1d] shadow-inner shadow-white/20">
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="ml-1 w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">
            新突發醫囑 (STAT) - {order.bedLabel}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-600">
            {order.title} <span className="inline-block rounded-md bg-[#ffe8e1] px-1.5 py-0.5 text-[10px] font-bold text-[#b3341f]">{order.kind}</span>
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-slate-500">
            {order.orderedBy} 開立於 {order.orderedAt}
            {order.reason ? ` · ${order.reason}` : ''}
          </p>
        </div>
        <div className="ml-4 flex shrink-0">
          <button
            type="button"
            className="inline-flex rounded-full bg-white/50 text-slate-400 hover:bg-slate-100 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1e4ea7]"
            onClick={(e) => {
              e.stopPropagation()
              onDismiss()
            }}
          >
            <span className="sr-only">關閉</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export function StatNotification() {
  const { shiftId } = useShift()
  const location = useLocation()
  const seenIds = useRef<Set<string>>(new Set())
  const [toasts, setToasts] = useState<ApiStatOrder[]>([])

  const isDoctorPage = location.pathname === '/doctor/stat'
  
  // We only run this polling if shiftId is set and we're NOT on the doctor page
  useQuery({
    queryKey: ['stat-orders', shiftId],
    queryFn: async () => {
      if (!shiftId) return []
      const data = await apiGet<ApiStatOrder[]>(`/stat-orders?shiftId=${shiftId}&assignee=all`)
      return data
    },
    enabled: !isDoctorPage && !!shiftId,
    refetchInterval: 1000, // Poll every 1 second (near instant!)
    refetchIntervalInBackground: true,
  })

  // Hook into the cache directly via a separate useQuery or listen to data changes
  const { data: statOrders } = useQuery<ApiStatOrder[]>({
    queryKey: ['stat-orders', shiftId],
    enabled: false, // We rely on the polling query to update the cache
  })

  useEffect(() => {
    if (isDoctorPage) return
    if (!statOrders || statOrders.length === 0) return

    const newOrders = statOrders.filter(o => !seenIds.current.has(o.id) && o.status === 'pending')
    
    if (newOrders.length > 0) {
      newOrders.forEach(o => seenIds.current.add(o.id))

      // Add new orders to the toast list
      // If this is the initial load (seenIds is empty), we probably don't want to show a toast for everything,
      // but if we do, the user gets notified immediately. To prevent notification storm on load:
      if (seenIds.current.size > newOrders.length) {
        setToasts(prev => [...prev, ...newOrders].slice(-3)) // keep max 3 toasts
      } else {
        // Initial load: just mark them as seen
        statOrders.forEach(o => seenIds.current.add(o.id))
      }
    }
  }, [statOrders, isDoctorPage])

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 z-50 flex flex-col items-end gap-3 px-4 py-6 sm:p-6"
    >
      {toasts.map((toast) => (
        <StatToast
          key={toast.id}
          order={toast}
          onDismiss={() => {
            setToasts(prev => prev.filter(t => t.id !== toast.id))
          }}
        />
      ))}
    </div>
  )
}
