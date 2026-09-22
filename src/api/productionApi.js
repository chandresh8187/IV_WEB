import apiClient from "./apiClient";

export const getProductionsApi = async (params) => {
  const response = await apiClient.get("/productions", { params });
  return response.data;
};

export const saveProductionApi = async (body) => {
  const response = await apiClient.post("/productions/save", body);
  return response.data;
};

export const deleteProductionApi = async (id) => {
  const response = await apiClient.delete(`/productions/${id}`);
  return response.data;
};

export const getAvailablePlanningApi = async () => {
  const response = await apiClient.get("/production-planning/available");
  return response.data;
};

export const getShiftStatusApi = async () => {
  const response = await apiClient.get("/shifts/status");
  return response.data;
};

export const getProductionShiftStatusApi = async () => {
  const response = await apiClient.get("/shifts/production-context");
  return response.data;
};

export const getProductionContractorsApi = async () => {
  const response = await apiClient.get("/productions/contractors");
  return response.data;
};

export const updateProductionByIdApi = async ({ id, body }) => {
  const response = await apiClient.put(`/productions/${id}`, body);
  return response.data;
};

export const grantProductionEditApi = async ({ id, user_id }) => {
  const response = await apiClient.post(`/productions/${id}/edit-grant`, { user_id });
  return response.data;
};

export const getDefaultChallanApi = async () => {
  const response = await apiClient.get("/productions/preferences/default-challan");
  return response.data;
};

export const setDefaultChallanApi = async (planning_id) => {
  const response = await apiClient.put("/productions/preferences/default-challan", { planning_id });
  return response.data;
};

export const toggleShiftApi = async (body) => {
  const response = await apiClient.post("/shifts/toggle", body);
  return response.data;
};
