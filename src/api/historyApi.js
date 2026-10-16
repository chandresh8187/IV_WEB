import apiClient from "./apiClient";

export const getHistoryPartySummaryApi = async params =>
  (await apiClient.get('/production-history/party-summary', { params })).data;

export const getHistoryDatesApi = async (month) => {
  const response = await apiClient.get("/production-history/dates", { params: { month } });

  return response.data;
};

export const downloadProductionReportApi = async ({ type, value, date, item_id, planning_id, planning_item_id, shift_name }) => {
  const response = await apiClient.get("/production-history/report", {
    params: { type, value, date, item_id, planning_id, planning_item_id, shift_name },
    responseType: "blob",
  });
  return response;
};

export const getHistoryDateSummaryApi = async (date) => {
  const response = await apiClient.get("/production-history/date-summary", {
    params: { date },
  });

  return response.data;
};

export const getHistoryShiftTableApi = async ({ date, shift_name }) => {
  const response = await apiClient.get("/production-history/shift-table", {
    params: {
      date,
      shift_name,
    },
  });

  return response.data;
};

export const getHistoryMaterialSummaryApi = async (date) => {
  const response = await apiClient.get("/production-history/material-summary", {
    params: { date },
  });

  return response.data;
};

export const getHistoryPlanningSummaryApi = async (date) => {
  const response = await apiClient.get("/production-history/planning-summary", {
    params: { date },
  });

  return response.data;
};
