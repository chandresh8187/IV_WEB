import apiClient from "./apiClient";

export const getMonthlyReportApi = async (params) => (await apiClient.get("/monthly-reports", { params })).data;
export const downloadMonthlyReportApi = (params) => apiClient.get("/monthly-reports/pdf", { params, responseType: "blob" });
export const downloadDailyProductionReportApi = (params) => apiClient.get("/monthly-reports/daily-production/pdf", { params, responseType: "blob" });
export const downloadMonthlyDetailReportApi = (type, params) => apiClient.get(`/monthly-reports/details/${type}/pdf`, { params, responseType: 'blob' });
