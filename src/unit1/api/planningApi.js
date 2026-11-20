import api from "./apiClient";
const url = "/unit1/production/planning";
export const getMaterialTemplates = async () =>
  (await api.get(url + "/templates")).data.data;
export const getProductionPlans = async () =>
  (await api.get(url + "/plans")).data.data;
const save = async (kind, body) =>
  (
    await api({
      url: url + "/" + kind + (body.id ? "/" + body.id : ""),
      method: body.id ? "put" : "post",
      data: body,
    })
  ).data.data;
export const saveMaterialTemplate = (body) => save("templates", body);
export const saveProductionPlan = (body) => save("plans", body);
export const materialTemplatePdf = async (id) =>
  (await api.get(url + "/templates/" + id + "/pdf", { responseType: "blob" }))
    .data;

export const deleteMaterialTemplate = (row) => archive("templates", row);
export const deleteProductionPlan = (row) => archive("plans", row);
const archive = async (kind, row) =>
  (
    await api.delete(url + "/" + kind + "/" + row.id, {
      data: { version: row.version },
    })
  ).data.data;
