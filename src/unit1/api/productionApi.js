import apiClient from './apiClient'
export const getMonthlyProduction = async () => (await apiClient.get('/unit1/production/monthly-summary')).data.data

export async function getLiveProduction() {
  const { data } = await apiClient.get('/unit1/production/live')
  return data.data
}

export async function getAvailableProductionCoils(physical = false) {
  const { data } = await apiClient.get('/unit1/production/available-coils',{params:{physical:physical?'1':undefined}})
  return data.data
}

export async function getUsedCoilNumbers(coilId) {
  const { data } = await apiClient.get(`/unit1/production/available-coils/${coilId}/used`)
  return data.data
}

export async function getProductionRuns() {
  const { data } = await apiClient.get('/unit1/production/runs')
  return data.data
}

export async function startProductionRun(input) {
  const { data } = await apiClient.post('/unit1/production/runs', input)
  return data.data
}

export async function addProductionOutput({ id, pieces, note }) {
  const { data } = await apiClient.post(`/unit1/production/runs/${id}/output`, { pieces, note })
  return data.data
}

export async function changeProductionRun({ id, action }) {
  const { data } = await apiClient.post(`/unit1/production/runs/${id}/${action === 'remove' ? 'remove-coil' : action}`)
  return data.data
}

export async function getJobCards({status,assignable,q,machineId} = {}) {
  const { data } = await apiClient.get('/unit1/production/job-cards',{params:{status,assignable,q,machineId}})
  return data.data
}

export async function getJobCard(id) {
  const { data } = await apiClient.get(`/unit1/production/job-cards/${id}`)
  return data.data
}

export async function assignJobCard(jobCardId, machineId) {
  const { data } = await apiClient.put(`/unit1/production/job-cards/${jobCardId}/assign`, { machineId })
  return data.data
}

export async function unassignJobCard(jobCardId) {
  const { data } = await apiClient.put(`/unit1/production/job-cards/${jobCardId}/unassign`)
  return data.data
}

export async function verifyProductionCoil(input) {
  const { data } = await apiClient.post('/unit1/production/verify-coil', input)
  return data.data
}

export async function getMachineEntries(machineId, page = 1) {
  const { data } = await apiClient.get(`/unit1/production/machines/${machineId}/entries`, { params: { page } })
  return data.data
}

export async function getProductionHistoryDates() {
  const { data } = await apiClient.get('/unit1/production/history/dates')
  return data.data
}

export async function getProductionHistory({ date, shift = 'all', machineId, page = 1 }) {
  const { data } = await apiClient.get('/unit1/production/history', { params: { date, shift, machineId: machineId || undefined, page } })
  return data.data
}

export async function getHoleCheck(id) {
  const { data } = await apiClient.get(`/unit1/production/hole-checks/${id}`)
  return data.data
}

export async function saveJobCard(job) {
  const { data } = job.id
    ? await apiClient.put(`/unit1/production/job-cards/${job.id}`, job)
    : await apiClient.post('/unit1/production/job-cards', job)
  return data.data
}

export async function deleteJobCard(id) {
  const { data } = await apiClient.delete(`/unit1/production/job-cards/${id}`)
  return data.data
}

export async function approveHoleCheck({ id, measurements, remarks, requestKey, measuredCutLengthMm, measuredSectionSize, rejectedPieces, rejectedLines, entryKind }) {
  const { data } = await apiClient.post(`/unit1/production/runs/${id}/hole-check`, { measurements, approved: true, remarks, requestKey, measuredCutLengthMm, measuredSectionSize, rejectedPieces, rejectedLines, entryKind })
  return data.data
}

export async function addProductionBundle({ id, pieces }) {
  const { data } = await apiClient.post(`/unit1/production/runs/${id}/bundles`, { pieces })
  return data.data
}

export async function getMachineHoleChecks(machineId, date, page = 1) { const { data } = await apiClient.get(`/unit1/production/machines/${machineId}/hole-checks`, { params: { date, page } }); return data.data }
export async function getMachineHoleChecksPdf(machineId, date) { const { data } = await apiClient.get(`/unit1/production/machines/${machineId}/hole-checks/pdf`, { params: { date }, responseType: 'blob' }); return data }

export async function getHistoryHoleChecks(date, page = 1, filters={}) { const { data } = await apiClient.get('/unit1/production/history/hole-checks', { params: {date,page,shift:filters.shift||'all',machineId:filters.machineId||''} }); return data.data }

export async function getHistoryHoleChecksPdf(date, filters={}) { const { data } = await apiClient.get('/unit1/production/history/hole-checks/pdf', { params: {date,shift:filters.shift||'all',machineId:filters.machineId||''}, responseType: 'blob' }); return data }
export async function getProductionHistoryPdf(params) { const { data } = await apiClient.get('/unit1/production/history/pdf', { params, responseType: 'blob' }); return data }
export async function getJobCardPdf(id) { const { data } = await apiClient.get('/unit1/production/job-cards/' + id + '/pdf', { responseType: 'blob' }); return data }

export async function getLiveEntries(machineId='',page=1){const {data}=await apiClient.get('/unit1/production/entries',{params:{machineId,page}});return data.data;}

export async function getLiveInspections(machineId='',page=1,entryKind='inspection'){const {data}=await apiClient.get('/unit1/production/live-inspections',{params:{machineId,page,entryKind}});return data.data;}

export async function correctProductionEntry({id,...input}) { const {data}=await apiClient.post('/unit1/production/bundles/'+id+'/correction',input); return data.data; }
