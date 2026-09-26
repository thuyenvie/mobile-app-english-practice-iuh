import { create, isAxiosError } from "axios";

import { getAccessToken, removeAccessToken } from "@/lib/auth/tokenStorage";

/**
 * Gateway base URL.
 *
 * EXPO_PUBLIC_API_BASE_URL cho phép đổi địa chỉ API theo môi trường mà không

 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:9999/api";

const api = create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    Accept: "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (isAxiosError(error) && error.response?.status === 401) {
      await removeAccessToken();
    }

    return Promise.reject(error);
  },
);

export default api;
