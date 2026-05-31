import type { BurdenAssessment, SubjectivePayload } from '../api/client'
import { OBJECTIVE_FACTOR_LABELS, type ObjectiveFactorKey } from './burdenFactors'

export type BurdenDetailLine = {
  label: string
  value: string
  points?: number
}

const SUBJECTIVE_LABELS: Record<keyof SubjectivePayload, string> = {
  rassScore: 'RASS',
  agitatedFallRisk: '下床風險',
  agitatedTubeRemovalRisk: '拔管風險',
  drainageTube: '引流管',
  tubeFeeding: '管灌',
  dressingChangeFrequency: '換藥頻繁',
  vitalMonitoringFrequency: '監測頻繁',
}

function levelLabel(v: 0 | 1 | 2) {
  return v === 2 ? '高' : v === 1 ? '中' : '低'
}

export function buildBurdenDetailLines(assessment: BurdenAssessment): BurdenDetailLine[] {
  const lines: BurdenDetailLine[] = []

  for (const [key, raw] of Object.entries(assessment.objective)) {
    const points = Number(raw ?? 0)
    if (points <= 0) continue
    const label = OBJECTIVE_FACTOR_LABELS[key as ObjectiveFactorKey] ?? key
    lines.push({ label, value: String(points), points })
  }

  const s = assessment.subjective
  if (s) {
    if (s.rassScore != null) lines.push({ label: SUBJECTIVE_LABELS.rassScore, value: String(s.rassScore) })
    if (s.agitatedFallRisk) lines.push({ label: SUBJECTIVE_LABELS.agitatedFallRisk, value: '是' })
    if (s.agitatedTubeRemovalRisk) lines.push({ label: SUBJECTIVE_LABELS.agitatedTubeRemovalRisk, value: '是' })
    if (s.drainageTube) lines.push({ label: SUBJECTIVE_LABELS.drainageTube, value: '是' })
    if (s.tubeFeeding) lines.push({ label: SUBJECTIVE_LABELS.tubeFeeding, value: '是' })
    if (s.dressingChangeFrequency > 0) {
      lines.push({
        label: SUBJECTIVE_LABELS.dressingChangeFrequency,
        value: levelLabel(s.dressingChangeFrequency),
      })
    }
    if (s.vitalMonitoringFrequency > 0) {
      lines.push({
        label: SUBJECTIVE_LABELS.vitalMonitoringFrequency,
        value: levelLabel(s.vitalMonitoringFrequency),
      })
    }
  }

  return lines
}

export function burdenSummaryText(assessment: BurdenAssessment | undefined, maxItems = 5): string {
  if (!assessment) return '—'
  const lines = buildBurdenDetailLines(assessment)
  if (lines.length === 0) {
    return `客觀 ${assessment.score.objectiveTotal} · 主觀 ${assessment.score.subjectiveTotal}`
  }
  return lines
    .slice(0, maxItems)
    .map((line) => (line.points != null ? `${line.label} ${line.points}` : `${line.label} ${line.value}`))
    .join(' · ')
}

export function scoreToTone(score: number): 'high' | 'mid' | 'low' {
  if (score >= 22) return 'high'
  if (score >= 14) return 'mid'
  return 'low'
}
