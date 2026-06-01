import type { ApiShift } from '../api/client'

export function shiftStatusLabel(status: string) {
  if (status === 'confirmed') return '已確認'
  if (status === 'open') return '進行中'
  if (status === 'allocating') return '分配中'
  if (status === 'closed') return '已結束'
  return status
}

export function formatShiftDate(startsAt: string) {
  return new Date(startsAt).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Taipei',
  })
}

/** 班別下拉選單顯示（含日期與狀態） */
export function formatShiftOption(shift: Pick<ApiShift, 'label' | 'startsAt' | 'status'>) {
  return `${shift.label}（${shiftStatusLabel(shift.status)}）`
}

export const DEMO_NURSE_SHIFT_HINTS = ['2026/05/19 白班', '2026/05/20 白班']
