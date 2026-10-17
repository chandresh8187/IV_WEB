import apiClient from './apiClient'

const root = '/unit1/users'
export const listUsers = async () => (await apiClient.get(root)).data.data
export const createUser = async input => (await apiClient.post(root, input)).data.data
export const updateUser = async ({ id, input }) => (await apiClient.put(`${root}/${id}`, input)).data.data
export const assignLabourMachine = async ({ id, machineId }) => (await apiClient.put(`${root}/${id}/machine-assignment`, { machineId })).data.data
export const setUserStatus = async ({ id, status }) => (await apiClient.patch(`${root}/${id}/status`, { status })).data.data
export const resetUserPassword = async ({ id, password }) => (await apiClient.put(`${root}/${id}/password`, { password })).data.data
export const getUserPermissions = async id => (await apiClient.get(`${root}/${id}/permissions`)).data.data
export const updateUserPermissions = async ({ id, overrides }) => (await apiClient.put(`${root}/${id}/permissions`, { overrides })).data.data
