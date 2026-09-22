import apiClient from "./apiClient";

export const getFinancialYearsApi = async () => (await apiClient.get("/financial-years")).data;
export const getCurrentFinancialYearApi = async () => (await apiClient.get("/financial-years/current")).data;
export const setCurrentFinancialYearApi = async (id) => (await apiClient.put(`/financial-years/${id}/current`)).data;
export const createFinancialYearApi = async (financialYear) => (await apiClient.post("/financial-years", { financial_year: financialYear })).data;
export const updateFinancialYearApi = async ({ id, financialYear }) => (await apiClient.put(`/financial-years/${id}`, { financial_year: financialYear })).data;
export const deleteFinancialYearApi = async (id) => (await apiClient.delete(`/financial-years/${id}`)).data;

