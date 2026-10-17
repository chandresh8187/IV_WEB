import apiClient from './apiClient'

export async function getLiveProduction() {
  const { data } = await apiClient.get('/unit1/production/live')
  return data.data
}

export async function getAvailableProductionCoils() {
  const { data } = await apiClient.get('/unit1/production/available-coils')
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

export async function getJobCards() {
  const { data } = await apiClient.get('/unit1/production/job-cards')
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

export async function approveHoleCheck({ id, measurements }) {
  const { data } = await apiClient.post(`/unit1/production/runs/${id}/hole-check`, { measurements, approved: true })
  return data.data
}

export async function addProductionBundle({ id, pieces }) {
  const { data } = await apiClient.post(`/unit1/production/runs/${id}/bundles`, { pieces })
  return data.data
}
