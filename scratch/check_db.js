import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres@127.0.0.1/sad_frontend_v2'
})

async function run() {
  await client.connect()
  const res = await client.query(`
    select ai.admission_id, ar.id as run_id, ar.target_shift_id, ar.shift_id, coalesce(ar.target_shift_id, ar.shift_id) as coal, ai.nurse_id
    from allocation_items ai
    join allocation_runs ar on ar.id = ai.allocation_run_id
    where coalesce(ar.target_shift_id, ar.shift_id) = $1 and ai.nurse_id = $2
  `, ['00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000116'])
  console.log('SQL output:')
  console.log(res.rows)
  await client.end()
}

run().catch(console.error)
