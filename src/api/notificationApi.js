import apiClient from './apiClient';

export const sendTestNotificationApi = async payload =>
  (await apiClient.post('/notifications/test', payload)).data;

export const testLatestProductionZincApi = async () =>
  (await apiClient.post('/notifications/test-zinc')).data;
