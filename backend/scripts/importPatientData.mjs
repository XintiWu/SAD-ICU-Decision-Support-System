import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import pg from 'pg'

const { Client } = pg
const appUrl = process.env.DATABASE_URL ?? 'postgresql://postgres@%2Ftmp/sad_frontend_v2'

async function main() {
  const client = new Client({ connectionString: appUrl })
  await client.connect()

  const raw = await readFile(resolve('backend/db/病人模擬資料.json'), 'utf8')
  const patients = JSON.parse(raw)

  for (const p of patients) {
    const bedLabel = p['床號']
    const name = p['病人姓名']
    const sex = p['性別']
    const birthDate = parseDate(p['出生日期'])
    const diagnosis = p['診斷 '].trim()
    const admittedAt = parseDate(p['住院日期'])
    const physician = p['主治醫師']

    // 找 bed_id
    const bedResult = await client.query(
      `SELECT id FROM beds WHERE label = $1`,
      [bedLabel]
    )
    if (bedResult.rows.length === 0) {
      console.warn(`找不到床號 ${bedLabel}，跳過`)
      continue
    }
    const bedId = bedResult.rows[0].id

    // 插入 patient
    const patientResult = await client.query(
      `INSERT INTO patients (name, sex, birth_date)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [name, sex, birthDate]
    )
    let patientId
    if (patientResult.rows.length === 0) {
      const existing = await client.query(
        `SELECT id FROM patients WHERE name = $1`, [name]
      )
      patientId = existing.rows[0].id
    } else {
      patientId = patientResult.rows[0].id
    }

    // 插入 admission
    await client.query(
      `INSERT INTO admissions (patient_id, bed_id, diagnosis, admitted_at, attending_physician, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       ON CONFLICT (bed_id) WHERE status = 'active' DO UPDATE SET
         diagnosis = EXCLUDED.diagnosis,
         attending_physician = EXCLUDED.attending_physician,
         updated_at = now()`,
      [patientId, bedId, diagnosis, admittedAt, physician]
    )

    console.log(`✓ ${bedLabel} ${name}`)
  }

  await client.end()
  console.log('匯入完成')
}

function parseDate(str) {
  if (!str) return null
  // 支援 2026/4/16 格式
  return str.replace(/\//g, '-')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
