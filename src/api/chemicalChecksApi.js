import apiClient from './apiClient';

export const getChemicalChecksApi = async params =>
  (await apiClient.get('/chemical-checks', { params })).data;
export const saveChemicalCheckApi = async body =>
  (await apiClient.post('/chemical-checks', body)).data;
export const downloadChemicalChecksReportApi = params =>
  apiClient.get('/chemical-checks/pdf', { params, responseType: 'blob' });
