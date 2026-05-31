import type { ApiShift } from '../api/client'
import { shiftStatusLabel } from '../context/ShiftContext'

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

/** Demo：陳O媚有值班且有分床資料的班別 */
export const DEMO_NURSE_SHIFT_HINTS = ['2026/05/08 白班', '2026/05/19 白班', '2026/05/20 白班']
