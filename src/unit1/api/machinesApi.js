import apiClient from './apiClient'

export async function listMachines() {
  const { data } = await apiClient.get('/unit1/machines')
  return data.data
}

export async function listActiveMachines() {
  const { data } = await apiClient.get('/unit1/machines?active=1')
  return data.data
}

export async function createMachine(machine) {
  const { data } = await apiClient.post('/unit1/machines', machine)
  return data.data
}

export async function updateMachine({ id, ...machine }) {
  const { data } = await apiClient.put(`/unit1/machines/${id}`, machine)
  return data.data
}
