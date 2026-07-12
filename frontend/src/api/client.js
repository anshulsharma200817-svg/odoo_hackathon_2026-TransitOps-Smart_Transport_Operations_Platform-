import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api",
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalConfig = error.config;
    if (error.response?.status === 401 && !originalConfig._retry) {
      originalConfig._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          // Use clean axios instance without interceptors to prevent infinite retry loops
          const { data } = await axios.post(
            `${client.defaults.baseURL.replace(/\/+$/, "")}/auth/refresh/`,
            { refresh: refreshToken }
          );
          if (data.access) {
            localStorage.setItem("access_token", data.access);
            originalConfig.headers.Authorization = `Bearer ${data.access}`;
            return client(originalConfig);
          }
        } catch (refreshError) {
          // Refresh failed (token expired or invalid), proceed with wipe
        }
      }
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("role");
    }
    return Promise.reject(error);
  }
);

export default client;
