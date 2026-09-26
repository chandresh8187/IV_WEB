import apiClient from "./apiClient";

export const getControlPanelSettingsApi = async () => {
  const response = await apiClient.get("/settings");
  return response.data;
};

export const updateControlPanelSettingApi = async ({ key, body }) => {
  const response = await apiClient.put(`/settings/${key}`, body);
  return response.data;
};

export const getAndroidUpdateApi = async () => {
  const response = await apiClient.get("/app-update/android");
  return response.data;
};

export const updateAndroidUpdateApi = async (body) => {
  const response = await apiClient.put("/app-update/android", body);
  return response.data;
};

export const triggerOtaUpdateApi = async (passcode) => {
  const response = await apiClient.post("/app-update/ota/trigger", { passcode });
  return response.data;
};

export const uploadAndroidApkApi = async (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append("apk", file);
  const response = await apiClient.post("/app-update/android/upload", formData, {
    timeout: 10 * 60 * 1000,
    onUploadProgress,
  });
  return response.data;
};

export const getAuditLogsApi = async (limit = 100) => {
  const response = await apiClient.get("/settings/audit/logs", {
    params: { limit },
  });
  return response.data;
};
