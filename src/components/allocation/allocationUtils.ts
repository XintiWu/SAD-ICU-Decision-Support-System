import type { NurseId } from '../../types/allocation'

export type PatientTone = 'high' | 'mid' | 'low'
export type NurseLoadTone = 'high' | 'mid' | 'low'

export type EnrichedBed = {
  id: string
  bedLabel: string
  bedShort: string
  diagnosis: string
  score: number
  tone: PatientTone
  badges: string[]
}

export type PatientDragDetail = EnrichedBed & {
  patientName: string
  sex: '男' | '女'
  age: number
  admittedAt: string
  attendingPhysician: string
  burdenLines?: import('../../lib/burdenDisplay').BurdenDetailLine[]
  objectiveTotal?: number
  subjectiveTotal?: number
}

export type NurseLoadRow = {
  nurseId: NurseId
  load: number
  bedCount: number
  deltaFromAvg: number
  tone: NurseLoadTone
}

export type AllocationStats = {
  unassignedCount: number
  avg: number
  max: number
  min: number
  spread: number
  diffFromSuggested: number
  maxNurseId: NurseId | null
  minNurseId: NurseId | null
}

export function formatBedShort(bedLabel: string) {
  const m = bedLabel.match(/^MI-(\d+)$/i)
  return m ? `${m[1]}床` : bedLabel
}

export function nurseLoadTone(load: number): NurseLoadTone {
  if (load >= 20) return 'high'
  if (load >= 14) return 'mid'
  return 'low'
}

export function formatDelta(n: number) {
  if (n === 0) return '±0'
  return n > 0 ? `+${n}` : `${n}`
}

export const LOAD_BAR_MAX = 30
