import pg from 'pg'

const { Pool } = pg

export const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://postgres@%2Ftmp/sad_frontend_v2'

export const pool = new Pool({
  connectionString: databaseUrl,
})

export async function query(text, params = []) {
  const result = await pool.query(text, params)
  return result
}

export async function withTransaction(fn) {
  const client = await pool.connect()
  try {
    await client.query('begin')
    const result = await fn(client)
    await client.query('commit')
    return result
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

