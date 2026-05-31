type NurseLabelOpts = {
  nurseId?: string
  chargeNurseId?: string | null
  role?: string
}

export function isChargeNurse(opts: NurseLabelOpts): boolean {
  if (opts.role === 'charge_nurse') return true
  if (opts.nurseId && opts.chargeNurseId) return opts.nurseId === opts.chargeNurseId
  return false
}

/** 小組長姓名後加 (leader) */
export function formatNurseDisplay(shortName: string, opts: NurseLabelOpts = {}): string {
  if (!shortName || shortName === '—') return shortName
  return isChargeNurse(opts) ? `${shortName}(leader)` : shortName
}

export function formatNurseByShortName(shortName: string, chargeShortName?: string | null): string {
  if (!shortName || shortName === '—') return shortName
  if (chargeShortName && shortName === chargeShortName) return `${shortName}(leader)`
  return shortName
}
