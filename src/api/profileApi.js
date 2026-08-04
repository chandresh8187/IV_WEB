import apiClient from "./apiClient";

export const getMyProfileApi = async () => {
  const response = await apiClient.get("/auth/profile");
  return response.data;
};

export const updateMyProfileApi = async (body) => {
  const response = await apiClient.put("/auth/profile", body);
  return response.data;
};

export const changeMyPasswordApi = async (body) => {
  const response = await apiClient.put("/auth/change-password", body);
  return response.data;
};
