import pg from 'pg'
const { Client } = pg
const url = 'postgresql://postgres@%2Ftmp/postgres'

async function main() {
  const client = new Client({ connectionString: url })
  await client.connect()
  const res = await client.query('SELECT datname FROM pg_database')
  console.log('DATABASES:', res.rows.map(r => r.datname))
  await client.end()
}

main().catch(console.error)
