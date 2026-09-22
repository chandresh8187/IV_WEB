import apiClient from "./apiClient";

export const getProductionPlanningApi = async (params) => {
  const response = await apiClient.get("/production-planning", {
    params,
  });

  return response.data;
};

export const createProductionPlanningApi = async (body) => {
  const response = await apiClient.post("/production-planning", body);

  return response.data;
};

export const updateProductionPlanningApi = async ({ id, body }) => {
  const response = await apiClient.put(`/production-planning/${id}`, body);

  return response.data;
};

export const cancelProductionPlanningApi = async (id) => {
  const response = await apiClient.delete(`/production-planning/${id}`);

  return response.data;
};

