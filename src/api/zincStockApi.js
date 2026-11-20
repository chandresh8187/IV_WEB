import apiClient from "./apiClient";

export const getZincStockApi = async () => (await apiClient.get("/zinc-stock")).data;
export const getAverageZincRateApi = async () => (await apiClient.get("/zinc-stock/average-rate")).data;
export const getRateCalculatorContextApi = async () => (await apiClient.get("/zinc-stock/rate-calculator-context")).data;
export const getZincTransferContextApi = async () => (await apiClient.get("/zinc-stock/transfer-context")).data;
export const getZincMovementsApi = async (params) => (await apiClient.get("/zinc-stock/movements", { params })).data;
export const saveZincMovementApi = async (body) => (await apiClient.post("/zinc-stock/movements", body)).data;
export const downloadZincStockReportApi = () => apiClient.get("/zinc-stock/movements/pdf", { responseType: "blob" });
export const saveZincByproductApi = async (body) => (await apiClient.post("/zinc-stock/byproducts", body)).data;
export const getZincByproductsApi = async (params) => (await apiClient.get("/zinc-stock/byproducts", { params })).data;
export const downloadZincByproductReportApi = params => apiClient.get("/zinc-stock/byproducts/pdf", { params, responseType: "blob" });
export const getZincPurchasesApi = async params => (await apiClient.get('/zinc-stock/purchases', { params })).data;
export const saveZincPurchaseApi = async body => (await apiClient.post('/zinc-stock/purchases', body)).data;
export const editZincPurchaseApi = async (id, body) => (await apiClient.put(`/zinc-stock/purchases/${id}`, body)).data;
export const downloadZincPurchaseReportApi = params => apiClient.get('/zinc-stock/purchases/pdf', { params, responseType: 'blob' });

export const editZincByproductApi = async (id, body) => (await apiClient.put(`/zinc-stock/byproducts/${id}`, body)).data;
