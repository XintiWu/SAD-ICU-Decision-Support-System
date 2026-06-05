import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import pg from 'pg'
import { ids } from '../src/step1Data.mjs'
import {
  burdenAssessments,
  objectiveFactorDefinitions,
  subjectiveFactorDefinitions,
  tasks,
} from '../src/step2Data.mjs'

const { Client } = pg

const adminUrl = process.env.DATABASE_ADMIN_URL ?? 'postgresql://postgres@%2Ftmp/postgres'
const databaseName = process.env.POSTGRES_DB ?? 'sad_frontend_v2'
const appUrl = process.env.DATABASE_URL ?? `postgresql://postgres@%2Ftmp/${databaseName}`
const setupMode = process.env.DATABASE_SETUP_MODE ?? 'database'

async function main() {
  const app = new Client({ connectionString: appUrl })
  if (setupMode === 'database') {
    const admin = new Client({ connectionString: adminUrl })
    await admin.connect()
    await admin.query(`drop database if exists ${quoteIdent(databaseName)} with (force)`)
    await admin.query(`create database ${quoteIdent(databaseName)}`)
    await admin.end()
  }

  await app.connect()
  if (setupMode === 'schema') {
    await app.query('drop schema if exists public cascade')
    await app.query('create schema public')
  }

  for (const file of [
    'backend/db/migrations/001_core_schema.sql',
    'backend/db/migrations/002_burden_tasks_schema.sql',
    'backend/db/migrations/003_allocation_schema.sql',
    'backend/db/migrations/004_stat_orders_schema.sql',
    'backend/db/migrations/005_handoff_schema.sql',
    'backend/db/migrations/006_allocation_decision_logs.sql',
    'backend/db/seeds/001_demo_core_data.sql',
    'backend/db/seeds/002_demo_burden_tasks_data.sql',
    'backend/db/seeds/003_demo_allocation_data.sql',
    'backend/db/seeds/004_demo_stat_orders_data.sql',
  ]) {
    const sql = await readFile(resolve(file), 'utf8')
    await app.query(sql)
  }
  await seedCompleteDemoData(app)
  await app.end()
  console.log(`Database ready: ${appUrl}`)

  const { confirmAllocationRun, suggestAllocationRun } = await import('../src/pgRepository.mjs')
  const firstRun = await suggestAllocationRun({
    shiftId: '00000000-0000-0000-0000-000000000201',
    userId: ids.chargeNurse,
  })
  await confirmAllocationRun({
    allocationRunId: firstRun.allocationRunId,
    userId: ids.chargeNurse,
  })
  console.log('第一班（5/19 白班）的預分配資料已就緒，後續班次均保持未分配狀態！')
}

function quoteIdent(value) {
  return `"${value.replaceAll('"', '""')}"`
}

async function seedCompleteDemoData(client) {
  const factors = await client.query('select id, code from burden_factors')
  const factorId = new Map(factors.rows.map((row) => [row.code, row.id]))

  for (const assessment of burdenAssessments) {
    const objectiveTotal = Object.values(assessment.objective).reduce((sum, value) => sum + Number(value ?? 0), 0)
    const subjectiveTotal = assessment.subjective ? subjectiveScore(assessment.subjective) : 0
    const assessmentResult = await client.query(
      `
      insert into burden_assessments (
        id, shift_id, admission_id, submitted_by, status,
        objective_total, subjective_total, total_score, submitted_at, updated_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      on conflict (shift_id, admission_id) do nothing
      returning id
      `,
      [
        assessment.id,
        assessment.shiftId,
        assessment.admissionId,
        assessment.submittedBy,
        assessment.status,
        objectiveTotal,
        subjectiveTotal,
        objectiveTotal + subjectiveTotal,
        assessment.submittedAt,
        assessment.updatedAt,
      ],
    )
    if (assessmentResult.rowCount === 0) continue

    for (const factor of objectiveFactorDefinitions) {
      const value = Number(assessment.objective[factor.code] ?? 0)
      await upsertBurdenValue(client, assessment.id, factorId.get(factor.code), value, null, null, value)
    }
    if (assessment.subjective) {
      for (const factor of subjectiveFactorDefinitions) {
        const value = assessment.subjective[factor.code]
        await upsertSubjectiveValue(client, assessment.id, factorId.get(factor.code), factor.valueType, value)
      }
    }
  }

  for (const task of tasks) {
    await client.query(
      `
      insert into tasks (
        id, shift_id, admission_id, assigned_nurse_id, title, kind,
        urgent, source, status, completed_at, completed_by, created_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      on conflict (id) do update set
        status = excluded.status,
        completed_at = excluded.completed_at,
        completed_by = excluded.completed_by
      `,
      [
        task.id,
        task.shiftId,
        task.admissionId,
        task.assignedNurseId,
        task.title,
        task.kind,
        task.urgent,
        task.source,
        task.status,
        task.completedAt ?? null,
        task.completedBy ?? null,
        task.createdAt,
      ],
    )
  }
}

async function upsertBurdenValue(client, assessmentId, factorId, numberValue, booleanValue, levelValue, points) {
  const assessmentExists = await client.query(
    'select 1 from burden_assessments where id = $1',
    [assessmentId],
  )

  if (assessmentExists.rowCount === 0) {
    return
  }

  await client.query(
    `
    insert into burden_values (assessment_id, factor_id, number_value, boolean_value, level_value, points)
    values ($1,$2,$3,$4,$5,$6)
    on conflict (assessment_id, factor_id) do update set
      number_value = excluded.number_value,
      boolean_value = excluded.boolean_value,
      level_value = excluded.level_value,
      points = excluded.points
    `,
    [assessmentId, factorId, numberValue, booleanValue, levelValue, points],
  )
}

async function upsertSubjectiveValue(client, assessmentId, factorId, valueType, value) {
  if (valueType === 'boolean') {
    await upsertBurdenValue(client, assessmentId, factorId, null, Boolean(value), null, value ? 2 : 0)
  } else if (valueType === 'level') {
    await upsertBurdenValue(client, assessmentId, factorId, null, null, Number(value), Number(value))
  } else {
    await upsertBurdenValue(client, assessmentId, factorId, value, null, null, rassPoints(value))
  }
}

function subjectiveScore(subjective) {
  return (
    rassPoints(subjective.rassScore) +
    (subjective.agitatedFallRisk ? 2 : 0) +
    (subjective.agitatedTubeRemovalRisk ? 2 : 0) +
    (subjective.drainageTube ? 2 : 0) +
    (subjective.tubeFeeding ? 2 : 0) +
    Number(subjective.dressingChangeFrequency ?? 0) +
    Number(subjective.vitalMonitoringFrequency ?? 0)
  )
}

function rassPoints(value) {
  if (value == null || Number.isNaN(Number(value))) return 0
  const abs = Math.abs(Number(value))
  if (abs <= 1) return 0
  if (abs <= 3) return 1
  return 2
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
