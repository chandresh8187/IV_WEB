import apiClient from "./apiClient";

export const getPlantStatusApi = async () => {
  const response = await apiClient.get("/plant/status");
  return response.data;
};

export const updatePlantStatusApi = async (body) => {
  const response = await apiClient.post("/plant/status", body);

  return response.data;
};

export const getPlantStatusHistoryApi = async () => {
  const response = await apiClient.get("/plant/history");

  return response.data;
};
