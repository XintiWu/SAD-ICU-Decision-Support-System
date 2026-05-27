import type { BedId } from './demoStore'

const STORAGE_KEY = 'icu-burden-form-history-v1'

export type BurdenBedScore = {
  total: number
  subjective: number
  objective: number
}

export type BurdenFormHistoryEntry = {
  savedAt: string
  label: string
  scores: Partial<Record<BedId, BurdenBedScore>>
}

type StoredPayload = { version: 1; entries: BurdenFormHistoryEntry[] }

function readAll(): BurdenFormHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredPayload
    if (parsed?.version !== 1 || !Array.isArray(parsed.entries)) return []
    return parsed.entries
  } catch {
    return []
  }
}

function writeAll(entries: BurdenFormHistoryEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, entries } satisfies StoredPayload))
}

export function getLatestBurdenHistory(): BurdenFormHistoryEntry | null {
  const entries = readAll()
  return entries[0] ?? null
}

export function saveBurdenHistory(
  scores: Partial<Record<BedId, BurdenBedScore>>,
  label: string,
): BurdenFormHistoryEntry {
  const entry: BurdenFormHistoryEntry = {
    savedAt: new Date().toISOString(),
    label,
    scores,
  }
  const next = [entry, ...readAll()].slice(0, 20)
  writeAll(next)
  return entry
}

export function formatBurdenHistoryTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
