import pg from 'pg'
const { Client } = pg
const url = 'postgresql://postgres@%2Ftmp/sad_frontend_v2'

async function main() {
  const client = new Client({ connectionString: url })
  await client.connect()
  const runs = await client.query("select * from allocation_runs where shift_id = '00000000-0000-0000-0000-000000000202'")
  console.log('--- ALLOCATION RUNS FOR SHIFT 202 ---')
  console.log(runs.rows)
  await client.end()
}

main().catch(console.error)
