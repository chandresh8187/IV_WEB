import apiClient from "./apiClient";

export const getMonthlyReportApi = async (params) => (await apiClient.get("/monthly-reports", { params })).data;
export const downloadMonthlyReportApi = (params) => apiClient.get("/monthly-reports/pdf", { params, responseType: "blob" });

