import apiClient from './apiClient'

export async function getQrSettings() {
  const { data } = await apiClient.get('/unit1/qr-settings')
  return data.data
}

export async function saveQrSettings({ role, fields }) {
  const { data } = await apiClient.put(`/unit1/qr-settings/${role}`, { fields })
  return data.data
}
