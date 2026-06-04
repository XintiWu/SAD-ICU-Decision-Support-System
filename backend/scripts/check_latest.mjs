import pg from 'pg'
const { Client } = pg
const url = 'postgresql://postgres@%2Ftmp/sad_frontend_v2'

async function main() {
  const client = new Client({ connectionString: url })
  await client.connect()
  const latestSnapshot = await client.query('select * from handoff_snapshots order by created_at desc')
  console.log('ALL SNAPSHOTS:', latestSnapshot.rows)
  await client.end()
}

main().catch(console.error)
