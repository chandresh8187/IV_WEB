import apiClient from "./apiClient";

export const getCertificatesApi = async (params) => {
  const response = await apiClient.get("/certificates", { params });

  return response.data;
};

export const getCertificateByIdApi = async (id) => {
  const response = await apiClient.get(`/certificates/${id}`);

  return response.data;
};

export const createCertificateApi = async (body) => {
  const response = await apiClient.post("/certificates", body);

  return response.data;
};

export const deleteCertificatesApi = async (ids) => {
  const response = await apiClient.delete("/certificates", { data: { ids } });
  return response.data;
};

export const getCertificateReadingsApi = async ({ planningId, minimum, maximum }) => {
  const response = await apiClient.get("/certificates/readings", {
    params: { planning_id: planningId, minimum: minimum ?? "", maximum: maximum ?? "" },
  });
  return response.data;
};

export const generateCertificatePdfApi = async ({ certificate, readings }) => {
  const response = await apiClient.post("/certificates/pdf", { certificate, readings }, {
    responseType: "blob",
  });
  return response.data;
};

export const getCertificatePlanningApi = async () => {
  const response = await apiClient.get("/production-planning");

  return response.data;
};

export const getProductionsByChallanApi = async (challanNo) => {
  const response = await apiClient.get("/productions", {
    params: {
      challan_no: challanNo,
      limit: 500,
    },
  });

  return response.data;
};
