/**
 * 為 5/19、5/20 六個班別各產生一筆「已確認」分床（呼叫與前端相同的演算法）。
 * 執行：node backend/scripts/seedSixShiftAllocations.mjs
 */
import { confirmAllocationRun, suggestAllocationRun } from '../src/pgRepository.mjs'
import { ids } from '../src/step1Data.mjs'

const SIX_SHIFTS = [
  '00000000-0000-0000-0000-000000000202',
  '00000000-0000-0000-0000-000000000203',
  '00000000-0000-0000-0000-000000000204',
  '00000000-0000-0000-0000-000000000205',
  '00000000-0000-0000-0000-000000000206',
  '00000000-0000-0000-0000-000000000207',
]

async function main() {
  for (const shiftId of SIX_SHIFTS) {
    const run = await suggestAllocationRun({
      shiftId,
      userId: ids.chargeNurse,
    })
    const confirmed = await confirmAllocationRun({ allocationRunId: run.allocationRunId })
    const beds = confirmed.byNurse.reduce((n, row) => n + row.patients.length, 0)
    console.log(`✓ ${shiftId.slice(-3)} ${confirmed.stats.totalNurses} 護理師 · ${beds} 床已確認`)
  }
  console.log('\n完成。請在網頁切換班別後開「查看分床結果」。')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
