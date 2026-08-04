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
