import apiClient from "./apiClient";

export const getLabourWeightsApi = async () =>
  (await apiClient.get('/labour-weights')).data;

export const saveLabourWeightApi = async ({ id, ...body }) =>
  (await (id
    ? apiClient.put(`/labour-weights/${id}`, body)
    : apiClient.post('/labour-weights', body))).data;

export const getPendingLabourWeightsApi = async () =>
  (await apiClient.get("/labour-weights/pending")).data;
export const getLabourWeightModeApi = async () =>
  (await apiClient.get('/labour-weights/mode')).data;
export const setLabourWeightModeApi = async mode =>
  (await apiClient.put('/labour-weights/mode', { mode })).data;

export const consumeLabourWeightApi = async (id) =>
  (await apiClient.post(`/labour-weights/${id}/consume`)).data;

export const toggleLabourTimerApi = async (id, process, action, clientEventAtMs) =>
  (await apiClient.post(`/labour-weights/${id}/timers/${process}/toggle`, { action, client_event_at_ms: clientEventAtMs })).data;
