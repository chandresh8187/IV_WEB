import apiClient from "./apiClient";

export const getContractProductionApi = async (params) =>
  (await apiClient.get("/contractors/production", { params })).data;
export const getContractorDirectoryApi = async () =>
  (await apiClient.get("/contractors/directory")).data;
export const createContractorApi = async (name) =>
  (await apiClient.post("/contractors", { name })).data;
export const updateContractorApi = async ({ id, name }) =>
  (await apiClient.put(`/contractors/${id}`, { name })).data;
export const deleteContractorApi = async (id) =>
  (await apiClient.delete(`/contractors/${id}`)).data;

