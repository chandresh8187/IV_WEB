import apiClient from './apiClient'
export const getAndroidNotificationDevices = async () => (await apiClient.get('/unit1/notifications/devices')).data.data
export const sendAndroidTestNotification = async payload => (await apiClient.post('/unit1/notifications/test', { ...payload, deviceType: 'android' }, { timeout: 30000 })).data.data
