import apiClient from './apiClient';
// Read-only coil details and scanning belong to the retained production assignment flow.
export async function getCoil(id) {return (await apiClient.get(`/unit1/coils/${id}`)).data.data;}
export async function getPhysicalCoil(id,number) {return (await apiClient.get(`/unit1/coils/${id}/physical/${number}`)).data.data;}
export async function lookupCoilCode(code) {return (await apiClient.get(`/unit1/coils/lookup/${encodeURIComponent(code)}`)).data.data;}
export async function getScannedCoil(reference,number) {return (await apiClient.get(`/unit1/coils/scan/${encodeURIComponent(reference)}/${number}`)).data.data;}

export const getCoilStock=async ()=>(await apiClient.get('/unit1/coils/stock-summary')).data.data;
export const addCoilStock=async body=>(await apiClient.post('/unit1/coils/stock-receipts',body)).data.data;

export const getCoilSizes=async ()=>(await apiClient.get('/unit1/coils/stock-sizes')).data.data;
export const addCoilSize=async body=>(await apiClient.post('/unit1/coils/stock-sizes',body)).data.data;

export const getStockInvoices=async spec=>(await apiClient.get('/unit1/coils/stock-invoices',{params:{widthMm:spec.widthMm,thicknessMm:spec.thicknessMm,materialType:spec.materialType,grade:spec.grade}})).data.data;

export const getInvoicePrintQr=async id=>(await apiClient.post(`/unit1/coils/${id}/print-qr`)).data.data;
