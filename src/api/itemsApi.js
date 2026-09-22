import apiClient from "./apiClient";

export const getItemsApi = async () => (await apiClient.get("/items")).data;
export const createItemApi = async (itemName) => (await apiClient.post("/items", { item_name: itemName })).data;
export const updateItemApi = async ({ id, itemName }) => (await apiClient.put(`/items/${id}`, { item_name: itemName })).data;
export const deleteItemApi = async (id) => (await apiClient.delete(`/items/${id}`)).data;

