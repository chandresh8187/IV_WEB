import apiClient from "./apiClient";

export const getUsersApi = async () => {
  const response = await apiClient.get("/users");
  return response.data;
};

export const getActiveSupervisorsApi = async () => {
  const response = await apiClient.get("/supervisors/active");

  return response.data;
};

export const registerUserApi = async (body) => {
  const response = await apiClient.post("/auth/register", body);

  return response.data;
};

export const updateUserApi = async ({ id, body }) => {
  const response = await apiClient.put(`/users/${id}`, body);

  return response.data;
};

export const setUserStatusApi = async ({ id, status }) => {
  const response = await apiClient.patch(`/users/${id}/status`, { status });

  return response.data;
};

export const getUserPermissionsApi = async (id) => {
  const response = await apiClient.get(`/users/${id}/permissions`);
  return response.data;
};

export const updateUserPermissionsApi = async ({ id, overrides }) => {
  const response = await apiClient.put(`/users/${id}/permissions`, { overrides });
  return response.data;
};
