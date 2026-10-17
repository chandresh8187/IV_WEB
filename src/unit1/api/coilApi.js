import apiClient from './apiClient'

export async function listCoils() {
  const { data } = await apiClient.get('/unit1/coils')
  return data.data
}

export async function getCoil(id) {
  const { data } = await apiClient.get(`/unit1/coils/${id}`)
  return data.data
}

export async function getCoilUsage(id, page = 1) {
  const { data } = await apiClient.get(`/unit1/coils/${id}/usage`, { params: { page } })
  return data.data
}

export async function generateCoilQr(id) {
  const { data } = await apiClient.post(`/unit1/coils/${id}/generate-qr`)
  return data.data
}

export async function getScannedCoil(internalId, coilNumber) {
  const { data } = await apiClient.get(`/unit1/coils/scan/${encodeURIComponent(internalId)}/${coilNumber}`)
  return data.data
}

export async function createCoil(coil) {
  const { data } = await apiClient.post('/unit1/coils', coil)
  return data.data
}

export async function createCoils(inward) {
  const { data } = await apiClient.post('/unit1/coils/bulk', inward)
  return data.data
}

export async function updateCoil(id, coil) {
  const { data } = await apiClient.put(`/unit1/coils/${id}`, coil)
  return data.data
}

export async function deleteCoil(id) {
  const { data } = await apiClient.delete(`/unit1/coils/${id}`)
  return data.data
}
