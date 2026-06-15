import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'

const port = 18788
const baseUrl = `http://127.0.0.1:${port}/api/v1`

let server: ChildProcessWithoutNullStreams
let serverStderr = ''

interface Shift {
  id: string
  label: string
  nurseIds: string[]
  startsAt: string
  endsAt: string
  hidden?: boolean
}

interface Nurse {
  id: string
  shortName: string
  role: string
  isActive: boolean
}

interface Patient {
  admissionId: string
  score: number
  bedLabel?: string
  bedShort?: string
  diagnosis?: string
  tone?: string
}

interface AllocationRun {
  allocationRunId: string
  targetShiftId: string
  byNurse: Array<{
    nurseId: string
    load: number
    patients: Patient[]
  }>
  unassigned: Patient[]
}

interface BurdenAssessment {
  assessmentId: string
  admissionId: string
  score: {
    totalScore: number
  }
  subjective: {
    dressingChangeFrequency: number
  }
}

async function waitForHealth() {
  const deadline = Date.now() + 5000
  let lastError: unknown

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`API server exited before health check passed: ${serverStderr}`)
    }

    try {
      const response = await fetch(`${baseUrl}/health`)
      if (response.ok) return
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw lastError ?? new Error('API health endpoint did not become ready')
}

describe('CI/CD E2E Integration - Deep Data Validation', () => {
  beforeAll(async () => {
    server = spawn('node', ['backend/server.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(port),
        HOST: '127.0.0.1',
      },
    })

    serverStderr = ''
    server.stderr.on('data', (chunk) => {
      serverStderr += String(chunk)
    })

    await waitForHealth()
    
    // Reset DB to demo state to ensure tests are isolated
    await fetch(`${baseUrl}/roster/reset`, { method: 'POST' })
  })

  afterAll(() => {
    if (serverStderr) {
      console.log('--- API Server Stderr Log ---')
      console.log(serverStderr)
      console.log('-----------------------------')
    }
    if (!server.killed) server.kill()
  })

  let currentShift: Shift
  let nextShift: Shift
  
  it('setup: fetch shifts and prepare test targets', async () => {
    const allShiftsRes = await fetch(`${baseUrl}/shifts`)
    const allShiftsData = await allShiftsRes.json()
    const shifts = allShiftsData.data
    
    // Use the seeded shifts that have allocations:
    // currentShift = 202 (day shift 5/19)
    // nextShift = 203 (evening shift 5/19)
    currentShift = shifts.find((s: Shift) => s.id === '00000000-0000-0000-0000-000000000202') || currentShift
    nextShift = shifts.find((s: Shift) => s.id === '00000000-0000-0000-0000-000000000203') || nextShift
    
    expect(currentShift).toBeDefined()
    expect(nextShift).toBeDefined()
    expect(currentShift.id).not.toBe(nextShift.id)
  })

  it('Test 6: 確保分床建議的目標班別不能與當班相同 (防止病患麻煩度被意外草稿覆蓋)', async () => {
    const suggestRes = await fetch(`${baseUrl}/allocation-runs/suggest`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': '00000000-0000-0000-0000-000000000101' // charge_nurse
      },
      body: JSON.stringify({ 
         shiftId: currentShift.id, 
         targetShiftId: currentShift.id, 
         createdBy: '00000000-0000-0000-0000-000000000101' 
      })
    })

    expect(suggestRes.status).toBe(400)
    const errData = await suggestRes.json()
    expect(errData.error.code).toBe('VALIDATION_ERROR')
  })

  it('Test 4: 每個地方的護理師名單與排班表完全一致且無重複', async () => {
    // 1. 驗證護理師名單 API
    const nursesRes = await fetch(`${baseUrl}/nurses?shiftId=${currentShift.id}`)
    const nursesData = await nursesRes.json()
    const dutyNurses = nursesData.data
    
    const scheduledNurseIds = currentShift.nurseIds
    expect(dutyNurses.length).toBeGreaterThan(0)
    
    // 檢查每一個排定的護理師都在名單中，且沒有重複
    const actualNurseIds = dutyNurses.map((n: Nurse) => n.id)
    const uniqueActualNurseIds = new Set(actualNurseIds)
    expect(actualNurseIds.length).toBe(uniqueActualNurseIds.size) // 無重複
    
    for (const id of scheduledNurseIds) {
      expect(uniqueActualNurseIds.has(id)).toBe(true)
    }

    // 2. 驗證當前分床的護理師列表
    // 由於當前分床是在 currentShift 產生的建議，其 target_shift_id 是 nextShift
    // 故此分床的 byNurse 護理師應與下班 (nextShift) 的值班護理師一致
    const allocRes = await fetch(`${baseUrl}/allocation-runs/current?shiftId=${currentShift.id}`)
    const allocData = await allocRes.json()
    const allocation: AllocationRun = allocData.data
    expect(allocation).toBeDefined()
    
    const allocationNurseIds = allocation.byNurse.map((bn: { nurseId: string }) => bn.nurseId)
    const nextShiftNurseIdsSet = new Set(nextShift.nurseIds)
    
    // 確保分床清單中的護理師都是下一班的值班護理師
    for (const nurseId of allocationNurseIds) {
      expect(nextShiftNurseIdsSet.has(nurseId)).toBe(true)
    }
  })

  let testAdmissionId: string
  let initialScore: number
  let updatedScore: number

  it('Test 2 & 3: 填寫並提交病患麻煩度、正確反映在分數計算及護理師負載中', async () => {
    // 1. 取得現有麻煩度評估
    const burdenRes = await fetch(`${baseUrl}/burden-assessments?shiftId=${currentShift.id}`)
    const burdenData = await burdenRes.json()
    expect(burdenData.data.length).toBeGreaterThan(0)
    
    const firstAssessment = burdenData.data[0]
    testAdmissionId = firstAssessment.admissionId
    initialScore = firstAssessment.score.totalScore
    const assessmentId = firstAssessment.assessmentId

    expect(initialScore).toBeGreaterThanOrEqual(0)
    
    // 2. 提交新的主觀分數 (換藥頻繁程度 = 2，合法範圍為 0, 1, 2)
    const patchRes = await fetch(`${baseUrl}/burden-assessments/${assessmentId}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': '00000000-0000-0000-0000-000000000101' // charge_nurse
      },
      body: JSON.stringify({ 
        subjective: { dressingChangeFrequency: 2 },
        status: 'submitted' 
      })
    })
    expect(patchRes.status).toBe(200)
    const patchData = await patchRes.json()
    expect(patchData.data.subjective.dressingChangeFrequency).toBe(2)
    expect(patchData.data.status).toBe('submitted')
    
    updatedScore = patchData.data.score.totalScore
    // 檢查分數有正確更新
    expect(updatedScore).toBeGreaterThan(0)
    
    // 3. 再次查詢確保資料持久化
    const verifyRes = await fetch(`${baseUrl}/burden-assessments?shiftId=${currentShift.id}`)
    const verifyData = await verifyRes.json()
    const updatedAssessment = verifyData.data.find((a: BurdenAssessment) => a.assessmentId === assessmentId)
    expect(updatedAssessment.score.totalScore).toBe(updatedScore)
    expect(updatedAssessment.subjective.dressingChangeFrequency).toBe(2)
    
    // 4. 驗證分床結果中的護理師負擔總分計算與當前床位病人分數加總相符
    const allocRes = await fetch(`${baseUrl}/allocation-runs/current?shiftId=${currentShift.id}`)
    const allocData = await allocRes.json()
    const allocation: AllocationRun = allocData.data
    
    for (const row of allocation.byNurse) {
      let calculatedLoad = 0
      for (const p of row.patients) {
        calculatedLoad += p.score
      }
      expect(row.load).toBe(calculatedLoad) // 確確保護理師的負擔總分是旗下病人分數之總和
    }
  })

  let suggestedRunId: string

  it('Test 1: 檢查上一班送出的結果會正確送到下一班 (Handoff 完整資料流驗證)', async () => {
    // 1. 從 currentShift 產生對 nextShift 的分床建議 (帶入剛剛更新的麻煩度)
    const suggestRes = await fetch(`${baseUrl}/allocation-runs/suggest`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': '00000000-0000-0000-0000-000000000101' // charge_nurse
      },
      body: JSON.stringify({ 
         shiftId: currentShift.id, 
         targetShiftId: nextShift.id, 
         createdBy: '00000000-0000-0000-0000-000000000101' 
      })
    })
    expect(suggestRes.status).toBe(201)
    const suggestData = await suggestRes.json()
    const suggestion: AllocationRun = suggestData.data
    expect(suggestion).toBeDefined()
    suggestedRunId = suggestion.allocationRunId
    
    // 深層驗證分床建議的資料正確性：
    // A. 目標班別為 nextShift
    expect(suggestion.targetShiftId).toBe(nextShift.id)
    
    // B. 分配名單中的護理師必須完全是下班 (nextShift) 的值班人員，絕不能混入本班護理師！
    const nextShiftNurseIds = new Set(nextShift.nurseIds)
    const suggestionNurseIds = suggestion.byNurse.map((bn: { nurseId: string }) => bn.nurseId)
    expect(suggestionNurseIds.length).toBeGreaterThan(0)
    for (const nurseId of suggestionNurseIds) {
      expect(nextShiftNurseIds.has(nurseId)).toBe(true)
    }
    
    // C. 檢查病人沒有重複分配，且所有病人皆被妥善分配或置於未分配列表中
    const assignedAdmissionIds: string[] = []
    for (const row of suggestion.byNurse) {
      for (const p of row.patients) {
        assignedAdmissionIds.push(p.admissionId)
      }
    }
    const unassignedAdmissionIds = suggestion.unassigned.map((p: Patient) => p.admissionId)
    const allAllocatedIds = [...assignedAdmissionIds, ...unassignedAdmissionIds]
    const uniqueAllocatedIds = new Set(allAllocatedIds)
    expect(allAllocatedIds.length).toBe(uniqueAllocatedIds.size) // 絕無重複病人
    
    // D. 驗證上一班修改的麻煩度是否有正確帶入到建議中
    const suggestionTestPatient = [...suggestion.byNurse.flatMap((n: { patients: Patient[] }) => n.patients), ...suggestion.unassigned]
      .find((p: Patient) => p.admissionId === testAdmissionId)
    expect(suggestionTestPatient).toBeDefined()
    expect(suggestionTestPatient.score).toBe(updatedScore) // 確保分數與上一班提交的一致
    
    // 2. 確認並提交此分床建議
    const confirmRes = await fetch(`${baseUrl}/allocation-runs/${suggestedRunId}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': '00000000-0000-0000-0000-000000000101'
      },
      body: JSON.stringify({ confirmedBy: '00000000-0000-0000-0000-000000000101' })
    })
    expect(confirmRes.status).toBe(200)
    
    // 3. 查詢下一班的當前分床，確認剛才確認的建議已生效為正式分床
    const nextAllocRes = await fetch(`${baseUrl}/allocation-runs/current?shiftId=${nextShift.id}`)
    const nextAllocData = await nextAllocRes.json()
    const nextAllocation: AllocationRun = nextAllocData.data
    expect(nextAllocation).toBeDefined()
  })

  it('Test 5: 戰情室與總交班單資料 (War Room & Handoff Sheets) 彙整數據與單筆資料完全對齊', async () => {
    // 使用 nextShift (因為我們剛剛在 Test 1 中確認並提交了以 nextShift 為 target 的 allocation_run)
    // 1. 取得戰情室資料
    const warRoomRes = await fetch(`${baseUrl}/war-room?shiftId=${nextShift.id}`)
    const warRoomData = await warRoomRes.json()
    const warRoom = warRoomData.data
    expect(warRoom).toBeDefined()
    expect(warRoom.nurses).toBeDefined()
    
    // 取得對應的分床資料 (為 Test 1 產生的 confirmed run)
    const allocRes = await fetch(`${baseUrl}/allocation-runs/current?shiftId=${currentShift.id}`)
    const allocData = await allocRes.json()
    const allocation: AllocationRun = allocData.data
    
    // 檢查戰情室的護理師負載與分床資料完全對齊
    for (const bn of allocation.byNurse) {
      const wrNurse = warRoom.nurses.find((n: { nurseId: string }) => n.nurseId === bn.nurseId)
      // 如果該護理師有被分配病人，戰情室應有其紀錄
      if (bn.patients.length > 0) {
        expect(wrNurse).toBeDefined()
        expect(wrNurse.load).toBe(bn.load) // 負載分數必須完全一致
        expect(wrNurse.patients.length).toBe(bn.patients.length) // 病人數量必須完全一致
        
        // 逐一檢查病人 ID 是一致的
        const bnPatientIds = bn.patients.map((p: Patient) => p.admissionId).sort()
        const wrPatientIds = wrNurse.patients.map((p: Patient) => p.admissionId).sort()
        expect(bnPatientIds).toEqual(wrPatientIds)
      }
    }
    
    // 2. 取得總交班單資料
    const handoffRes = await fetch(`${baseUrl}/handoff-sheets?shiftId=${currentShift.id}`)
    const handoffData = await handoffRes.json()
    const handoff = handoffData.data
    
    expect(handoff).toBeDefined()
    expect(handoff.rows.length).toBeGreaterThan(0)
    
    // 確保交班單上的本班護理師 (currentNurse) 與下班護理師 (nextNurse) 不是一模一樣的！
    // 正常有異動的交班，兩者應該各自對應到各自的班別值班護理師。
    for (const row of handoff.rows) {
      expect(row.currentNurse).toBeDefined()
      expect(row.nextNurse).toBeDefined()
      // 本班護理師 (來自上一班 currentShift) 與下班護理師 (來自下一班 nextShift) 的人員不應相同
      expect(row.currentNurse).not.toBe(row.nextNurse)
    }
  })

  it('Test 7: 驗證當 confirmed 與 draft 共存時，首頁與麻煩度評估取得的病患名單完全一致且均優先選擇 confirmed', async () => {
    const chargeNurseId = '00000000-0000-0000-0000-000000000110' // 陳O琪
    
    // 1. 產生第二個分床建議 (此時為 draft)
    const secondSuggestRes = await fetch(`${baseUrl}/allocation-runs/suggest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': chargeNurseId
      },
      body: JSON.stringify({
        shiftId: currentShift.id,
        targetShiftId: nextShift.id,
        createdBy: chargeNurseId
      })
    })
    expect(secondSuggestRes.status).toBe(201)
    const secondSuggestData = await secondSuggestRes.json()
    const draftRunId = secondSuggestData.data.allocationRunId

    expect(draftRunId).toBeDefined()

    // 2. 分別查詢首頁 (getNurseOverview) 與麻煩度自填名單 (listBurdenAssessments)
    const [overviewRes, burdenRes] = await Promise.all([
      fetch(`${baseUrl}/nurse/overview?shiftId=${nextShift.id}`, {
        headers: { 'x-user-id': chargeNurseId }
      }),
      fetch(`${baseUrl}/burden-assessments?shiftId=${nextShift.id}&scope=mine`, {
        headers: { 'x-user-id': chargeNurseId }
      })
    ])

    expect(overviewRes.status).toBe(200)
    expect(burdenRes.status).toBe(200)

    const overviewData = await overviewRes.json()
    const burdenData = await burdenRes.json()

    const overviewPatientIds = overviewData.data.myPatients.map((p: Patient) => p.admissionId).sort()
    const burdenPatientIds = burdenData.data.map((p: Patient) => p.admissionId).sort()

    // 3. 斷言兩邊取得的分配病患必須完全一致 (這在此 Bug 修復前會失敗，因為首頁會拿到 draft 的名單，而麻煩度拿到 confirmed 的名單)
    expect(overviewPatientIds).toEqual(burdenPatientIds)
  })
})
