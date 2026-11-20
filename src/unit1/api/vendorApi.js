import apiClient from './apiClient';

export const getVendors = async () =>
  (await apiClient.get('/unit1/vendors')).data.data;

export const createVendor = async body =>
  (await apiClient.post('/unit1/vendors', body)).data.data;
