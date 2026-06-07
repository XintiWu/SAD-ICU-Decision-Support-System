import { describe, expect, it } from 'vitest'
import { buildBoardLoadRows, computeBoardLoads, computeBoardStats } from './allocationBoardUtils'
import type { CatalogEntry } from './allocationApiState'

function entry(id: string, score: number): CatalogEntry {
  return {
    id,
    bedLabel: id,
    bedShort: id,
    diagnosis: '測試診斷',
    score,
    tone: score >= 22 ? 'high' : score >= 14 ? 'mid' : 'low',
    badges: [],
    patientName: id,
    sex: '男',
    age: 65,
    admittedAt: '2026-06-07',
    attendingPhysician: 'Dr. Test',
  }
}

describe('allocationBoardUtils', () => {
  const catalog = new Map<string, CatalogEntry>([
    ['A', entry('A', 10)],
    ['B', entry('B', 8)],
    ['C', entry('C', 7)],
  ])

  it('computes nurse load and bed counts from the board state', () => {
    const result = computeBoardLoads(catalog, { n1: ['A', 'C'], n2: ['B'] }, ['n1', 'n2'])

    expect(result.loads).toEqual({ n1: 17, n2: 8 })
    expect(result.bedCounts).toEqual({ n1: 2, n2: 1 })
  })

  it('computes allocation statistics and differences from suggested owner', () => {
    const result = computeBoardStats(
      catalog,
      ['C'],
      { n1: ['A'], n2: ['B'] },
      ['n1', 'n2'],
      { n1: ['A', 'B'], n2: [] },
    )

    expect(result).toEqual({
      unassignedCount: 1,
      avg: 9,
      max: 10,
      min: 8,
      spread: 2,
      diffFromSuggested: 1,
      maxNurseId: 'n1',
      minNurseId: 'n2',
    })
  })

  it('builds sorted load rows with average deltas and risk tone', () => {
    const rows = buildBoardLoadRows(
      ['n1', 'n2', 'n3'],
      { n1: 8, n2: 21, n3: 14 },
      { n1: 1, n2: 3, n3: 2 },
      14.3,
    )

    expect(rows).toEqual([
      { nurseId: 'n2', load: 21, bedCount: 3, deltaFromAvg: 6.7, tone: 'high' },
      { nurseId: 'n3', load: 14, bedCount: 2, deltaFromAvg: -0.3, tone: 'mid' },
      { nurseId: 'n1', load: 8, bedCount: 1, deltaFromAvg: -6.3, tone: 'low' },
    ])
  })
})
