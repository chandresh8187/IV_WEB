import apiClient from "./apiClient";

export const getShiftSettings = async () =>
  (await apiClient.get("/unit1/shifts")).data.data;
export const saveShiftSettings = async (schedule) =>
  (await apiClient.put("/unit1/shifts", schedule)).data.data;
