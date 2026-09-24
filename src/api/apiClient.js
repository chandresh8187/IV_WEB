import axios from "axios";

const PRODUCTION_API_URL = "https://app.ivsquarestructure.com/api";
const DEVELOPMENT_API_URL = "http://localhost:5000/api";
const configuredApiUrl = String(import.meta.env.VITE_API_BASE_URL || "").trim();
const defaultApiUrl = import.meta.env.DEV
  ? DEVELOPMENT_API_URL
  : PRODUCTION_API_URL;
const API_BASE_URL = configuredApiUrl || defaultApiUrl;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("iv:session-changed"));
    }

    return Promise.reject(error);
  },
);

export default apiClient;
