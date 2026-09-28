import apiClient from "./apiClient";

export const getLabourWeightsApi = async () =>
  (await apiClient.get('/labour-weights')).data;

export const saveLabourWeightApi = async ({ id, ms_weight, dipping_qty }) =>
  (await (id
    ? apiClient.put(`/labour-weights/${id}`, { ms_weight, dipping_qty })
    : apiClient.post('/labour-weights', { ms_weight, dipping_qty }))).data;

export const getPendingLabourWeightsApi = async () =>
  (await apiClient.get("/labour-weights/pending")).data;

export const consumeLabourWeightApi = async (id) =>
  (await apiClient.post(`/labour-weights/${id}/consume`)).data;
