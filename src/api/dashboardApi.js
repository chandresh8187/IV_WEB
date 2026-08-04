import apiClient from "./apiClient";

export const getDashboardApi = async () => {
  const response = await apiClient.get("/dashboard");

  return response.data;
};
