import { query } from '../backend/src/pgRepository.mjs'

async function run() {
  const result = await query('select id, shift_id, target_shift_id, status from allocation_runs')
  console.log(result.rows)
  process.exit(0)
}
run()
