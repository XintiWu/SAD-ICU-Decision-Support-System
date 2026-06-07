import { describe, expect, it } from 'vitest'
import { getIncompleteFields, objectiveTotal, subjectiveTotal } from './burdenFactors'
import type { SubjectivePayload } from '../api/client'

function subjective(overrides: Partial<SubjectivePayload> = {}): SubjectivePayload {
  return {
    rassScore: 0,
    agitatedFallRisk: false,
    agitatedTubeRemovalRisk: false,
    drainageTube: false,
    tubeFeeding: false,
    dressingChangeFrequency: 0,
    vitalMonitoringFrequency: 0,
    ...overrides,
  }
}

describe('burdenFactors', () => {
  it('sums objective burden values and treats missing values as zero', () => {
    expect(objectiveTotal({ medicationTypeCount: 2, crrtContinuousA: 3, empty: undefined as unknown as number })).toBe(5)
  })

  it('calculates subjective burden from RASS, risks, tubes, and frequency levels', () => {
    const score = subjectiveTotal(subjective({
      rassScore: -4,
      agitatedFallRisk: true,
      agitatedTubeRemovalRisk: true,
      drainageTube: true,
      tubeFeeding: true,
      dressingChangeFrequency: 1,
      vitalMonitoringFrequency: 2,
    }))

    expect(score).toBe(13)
  })

  it('marks RASS as incomplete when the subjective value is null', () => {
    expect(getIncompleteFields(subjective({ rassScore: null }))).toEqual(['RASS 鎮靜分數'])
    expect(getIncompleteFields(subjective({ rassScore: 1 }))).toEqual([])
  })
})
