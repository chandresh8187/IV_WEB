import apiClient from "./apiClient";

export const getPendingLabourWeightsApi = async () =>
  (await apiClient.get("/labour-weights/pending")).data;

export const consumeLabourWeightApi = async (id) =>
  (await apiClient.post(`/labour-weights/${id}/consume`)).data;
