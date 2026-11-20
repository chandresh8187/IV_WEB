import api from "./apiClient";
export const maintenanceOverview = async () =>
  (await api.get("/unit1/maintenance")).data.data;
export const maintenanceHistory = async (filters) =>
  (await api.get("/unit1/maintenance/history", { params: filters })).data.data;
export const saveMaintenance = async (kind, form, voiding = false) => {
  const url = `/unit1/maintenance/${kind}${form.id ? `/${form.id}` : ""}${
    voiding ? "/void" : ""
  }`;
  return (
    await api({ method: form.id && !voiding ? "put" : "post", url, data: form })
  ).data.data;
};
export const maintenancePdf = async (params) =>
  (
    await api.get("/unit1/maintenance/pdf", {
      params,
      responseType: "blob",
      timeout: 60000,
    })
  ).data;
export const maintenanceAudit = async (kind, id) =>
  (await api.get(`/unit1/maintenance/audit/${kind}/${id}`)).data.data;

export const startMaintenance=async body=>(await api.post('/unit1/maintenance/start',body)).data.data;
export const finishMaintenance=async(id,body)=>(await api.post('/unit1/maintenance/sessions/'+id+'/done',body)).data.data;
