import apiClient from './apiClient'

export async function updateMaterialDensity(materialType, densityGcm3) {
  const { data } = await apiClient.put(`/unit1/materials-grades/${encodeURIComponent(materialType)}/density`, { densityGcm3 })
  return data.data
}

export async function listMaterialsGrades() {
  const { data } = await apiClient.get('/unit1/materials-grades')
  return data.data
}

export async function createMaterialGrade(payload) {
  const { data } = await apiClient.post('/unit1/materials-grades', payload)
  return data.data
}

export async function updateMaterialGrade({ id, ...payload }) {
  const { data } = await apiClient.put(`/unit1/materials-grades/${id}`, payload)
  return data.data
}

export async function deleteMaterialGrade(id) {
  await apiClient.delete(`/unit1/materials-grades/${id}`)
}
