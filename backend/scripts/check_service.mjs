import { getHandoffSheet } from '../src/pgRepository.mjs'

async function main() {
  const result = await getHandoffSheet({ shiftId: '00000000-0000-0000-0000-000000000202' })
  console.log('GET HANDOFF SHEET RESULT:', result)
}

main().catch(console.error)
