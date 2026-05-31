import { useEffect, useState } from 'react'
import { apiGet, type ApiNurse } from '../api/client'
import { useShift } from '../context/useShift'

/** 當班小組長 ID：優先 shifts.chargeNurse，否則查排班 role=charge_nurse */
export function useChargeNurseId(shiftIdOverride?: string) {
  const { shiftId: ctxShiftId, selectedShift } = useShift()
  const shiftId = shiftIdOverride ?? ctxShiftId
  const fromShift =
    !shiftIdOverride || selectedShift?.id === shiftId ? selectedShift?.chargeNurse?.id ?? null : null
  const [fallbackId, setFallbackId] = useState<string | null>(null)

  useEffect(() => {
    if (fromShift) return
    let alive = true
    apiGet<ApiNurse[]>(`/nurses?shiftId=${shiftId}`)
      .then((rows) => {
        if (!alive) return
        setFallbackId(rows.find((n) => n.role === 'charge_nurse')?.id ?? null)
      })
      .catch(() => {
        if (alive) setFallbackId(null)
      })
    return () => {
      alive = false
    }
  }, [shiftId, fromShift])

  return fromShift ?? fallbackId
}
