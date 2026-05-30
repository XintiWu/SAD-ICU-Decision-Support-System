import * as pg from './pgRepository.mjs'
import { getCurrentShift as memGetCurrentShift, listShifts as memListShifts } from './step1Repository.mjs'

function useMemoryFallback(error) {
  const code = error?.code
  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === '3D000' || code === '57P03') return true
  const message = error?.message ?? ''
  return /connect|ECONNREFUSED|does not exist|role .* does not exist/i.test(message)
}

async function withFallback(pgFn, memFn) {
  try {
    return await pgFn()
  } catch (error) {
    if (useMemoryFallback(error)) return memFn()
    throw error
  }
}

export const ApiError = pg.ApiError
export const confirmAllocationRun = pg.confirmAllocationRun
export const getAllocationRun = pg.getAllocationRun
export const getCurrentUser = pg.getCurrentUser
export const getHandoffSheet = pg.getHandoffSheet
export const getNurseOverview = pg.getNurseOverview
export const getWarRoom = pg.getWarRoom
export const listAdmissions = pg.listAdmissions
export const listBurdenAssessments = pg.listBurdenAssessments
export const listNurses = pg.listNurses
export const listTasks = pg.listTasks
export const getLatestAllocationRun = pg.getLatestAllocationRun
export const suggestAllocationRun = pg.suggestAllocationRun
export const updateAllocationItems = pg.updateAllocationItems
export const updateBurdenAssessment = pg.updateBurdenAssessment
export const updateTask = pg.updateTask

export async function getCurrentShift(unitName = 'ICU') {
  return withFallback(
    () => pg.getCurrentShift(unitName),
    () => memGetCurrentShift(unitName),
  )
}

export async function listShifts(opts = {}) {
  return withFallback(
    () => pg.listShifts(opts),
    () => memListShifts(opts),
  )
}
