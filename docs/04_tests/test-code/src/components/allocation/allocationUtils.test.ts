import { describe, expect, it } from 'vitest'
import { formatBedShort, formatDelta, nurseLoadTone } from './allocationUtils'

describe('allocationUtils', () => {
  it('formats ICU bed labels into short Chinese bed labels', () => {
    expect(formatBedShort('MI-01')).toBe('01床')
    expect(formatBedShort('MI-12')).toBe('12床')
    expect(formatBedShort('ER-01')).toBe('ER-01')
  })

  it('classifies nurse load risk by threshold', () => {
    expect(nurseLoadTone(13.9)).toBe('low')
    expect(nurseLoadTone(14)).toBe('mid')
    expect(nurseLoadTone(19.9)).toBe('mid')
    expect(nurseLoadTone(20)).toBe('high')
  })

  it('formats positive, negative, and zero load deltas consistently', () => {
    expect(formatDelta(0)).toBe('±0')
    expect(formatDelta(2.5)).toBe('+2.5')
    expect(formatDelta(-1.5)).toBe('-1.5')
  })
})
