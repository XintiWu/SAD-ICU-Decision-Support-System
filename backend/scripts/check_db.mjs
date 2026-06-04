import pg from 'pg'
const { Client } = pg
const url = 'postgresql://postgres@%2Ftmp/sad_frontend_v2'

async function main() {
  const client = new Client({ connectionString: url })
  await client.connect()

  const rows = await client.query('select id, snapshot_id, bed_label, current_nurse, next_nurse from handoff_rows order by id limit 30')
  console.log('--- ALL HANDOFF ROWS ---')
  console.log(rows.rows)

  await client.end()
}

main().catch(console.error)
