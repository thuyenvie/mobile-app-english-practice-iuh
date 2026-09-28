import { create, isAxiosError } from "axios";
import { Platform } from "react-native";

import { getAccessToken, removeAccessToken } from "@/lib/auth/tokenStorage";

/**
 * Gateway base URL.
 *
 * EXPO_PUBLIC_API_BASE_URL cho phép đổi địa chỉ API theo môi trường mà không

 */
const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

// Native app không thể dùng localhost để gọi API đang chạy trên máy Mac:
// - Android emulator dùng 10.0.2.2.
// - iOS simulator có thể dùng localhost.
// - Thiết bị thật phải cấu hình IP LAN qua EXPO_PUBLIC_API_BASE_URL.
export const API_BASE_URL =
  configuredBaseUrl ||
  (Platform.OS === "android"
    ? "http://10.0.2.2:9999/api"
    : "http://localhost:9999/api");

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
