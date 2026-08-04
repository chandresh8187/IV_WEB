import apiClient from "./apiClient";

export const loginApi = async (credentials) => {
  const response = await apiClient.post("/auth/login", credentials);

  const { token, user } = response.data;

  if (!token || !user) {
    throw new Error("The backend did not return a valid token and user.");
  }

  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  window.dispatchEvent(new Event("iv:session-changed"));

  return response.data;
};

export const logoutApi = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event("iv:session-changed"));
};

export const getStoredUser = () => {
  try {
    const storedUser = localStorage.getItem("user");

    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};
