import { describe, expect, it } from 'vitest'
import { buildBurdenDetailLines, burdenSummaryText, scoreToTone } from './burdenDisplay'
import type { BurdenAssessment } from '../api/client'

function assessment(overrides: Partial<BurdenAssessment> = {}): BurdenAssessment {
  return {
    assessmentId: 'assessment-1',
    admissionId: 'admission-1',
    bedLabel: 'MI-01',
    diagnosis: '敗血症',
    objective: {
      negativePressureIsolation: 2,
      medicationTypeCount: 0,
    },
    subjective: {
      rassScore: -2,
      agitatedFallRisk: true,
      agitatedTubeRemovalRisk: false,
      drainageTube: false,
      tubeFeeding: true,
      dressingChangeFrequency: 1,
      vitalMonitoringFrequency: 2,
    },
    score: {
      objectiveTotal: 2,
      subjectiveTotal: 8,
      totalScore: 10,
      level: '低',
    },
    status: 'draft',
    ...overrides,
  }
}

describe('burdenDisplay', () => {
  it('builds readable burden detail lines and skips zero objective factors', () => {
    expect(buildBurdenDetailLines(assessment())).toEqual([
      { label: '負壓隔離病房', value: '2', points: 2 },
      { label: 'RASS', value: '-2' },
      { label: '下床風險', value: '是' },
      { label: '管灌', value: '是' },
      { label: '換藥頻繁', value: '中' },
      { label: '監測頻繁', value: '高' },
    ])
  })

  it('falls back to objective and subjective totals when no detail line exists', () => {
    expect(burdenSummaryText(assessment({
      objective: {},
      subjective: null,
      score: {
        objectiveTotal: 0,
        subjectiveTotal: 0,
        totalScore: 0,
        level: '低',
      },
    }))).toBe('客觀 0 · 主觀 0')
  })

  it('classifies total score tone for allocation display', () => {
    expect(scoreToTone(13.9)).toBe('low')
    expect(scoreToTone(14)).toBe('mid')
    expect(scoreToTone(21.9)).toBe('mid')
    expect(scoreToTone(22)).toBe('high')
  })
})
