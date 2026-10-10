import { create, isAxiosError, type InternalAxiosRequestConfig } from "axios";
import { Platform } from "react-native";

import {
  getAccessToken,
  getRefreshToken,
  removeTokens,
  saveTokenPair,
} from "@/lib/auth/tokenStorage";
import { notifySessionExpired } from "@/lib/auth/sessionEvents";

/**
 * Gateway base URL. Override it with EXPO_PUBLIC_API_BASE_URL per device/environment.
 */
const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

// Native app cannot use localhost for a backend running on the Mac:
// - Android emulator: 10.0.2.2
// - iOS simulator: localhost
// - Physical phone: the Mac's LAN IP
export const API_BASE_URL =
  configuredBaseUrl ||
  (Platform.OS === "android"
    ? "http://10.0.2.2:9999/api"
    : "http://localhost:9999/api");

const api = create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { Accept: "application/json" },
});

// Keep refresh traffic outside the main interceptors to prevent recursive refresh.
const refreshClient = create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { Accept: "application/json" },
});

interface AuthResult {
  token: string;
  refreshToken: string;
  success: boolean;
}
interface AuthEnvelope {
  code: number;
  message?: string;
  success: boolean;
  result?: AuthResult;
}
type RetriableRequest = InternalAxiosRequestConfig & {
  _accessTokenRetried?: boolean;
  _skipAuthRefresh?: boolean;
};

class RefreshUnavailableError extends Error {
  constructor() {
    super(
      "Không thể kết nối máy chủ xác thực để làm mới phiên. Hãy thử lại khi mạng ổn định."
    );
    this.name = "RefreshUnavailableError";
  }
}

class InvalidRefreshSessionError extends Error {
  constructor() {
    super("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    this.name = "InvalidRefreshSessionError";
  }
}

let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new InvalidRefreshSessionError();

  try {
    const response = await refreshClient.post<AuthEnvelope>(
      "/identity/auth/refresh",
      { refreshToken }
    );
    const result = response.data?.result;
    if (
      !response.data?.success ||
      !result?.success ||
      !result.token ||
      !result.refreshToken
    ) {
      throw new InvalidRefreshSessionError();
    }

    // Backend rotates both credentials; persist the new refresh token before retrying requests.
    await saveTokenPair(result.token, result.refreshToken);
    return result.token;
  } catch (error) {
    if (error instanceof InvalidRefreshSessionError) throw error;
    if (isAxiosError(error)) {
      const status = error.response?.status;
      // Network errors, server outages, rate limiting and timeouts should not destroy a valid session.
      if (!status || status === 408 || status === 429 || status >= 500) {
        throw new RefreshUnavailableError();
      }
      if (status === 400 || status === 401 || status === 403) {
        throw new InvalidRefreshSessionError();
      }
    }
    // Storage failures should preserve local credentials for a later retry.
    throw error;
  }
}

async function expireLocalSession(): Promise<void> {
  try {
    await removeTokens();
  } finally {
    notifySessionExpired();
  }
}

const loginEndpoints = new Set([
  "/identity/auth/login",
  "/identity/auth/google",
  "/identity/auth/google/mobile",
  "/identity/auth/outbound/authentication",
  "/identity/auth/refresh",
]);

api.interceptors.request.use(async (config) => {
  const requestPath = config.url?.split("?")[0].replace(/\/+$/, "");
  if (
    config.method?.toLowerCase() === "post" &&
    loginEndpoints.has(requestPath ?? "")
  ) {
    config.headers.delete("Authorization");
    return config;
  }

  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (
      !isAxiosError(error) ||
      error.response?.status !== 401 ||
      !error.config
    ) {
      return Promise.reject(error);
    }

    const request = error.config as RetriableRequest;
    const requestPath = request.url?.split("?")[0].replace(/\/+$/, "");
    if (request._skipAuthRefresh || loginEndpoints.has(requestPath ?? "")) {
      return Promise.reject(error);
    }

    // A retried request failing with 401 means the new access token cannot authorize this API.
    if (request._accessTokenRetried) {
      await expireLocalSession();
      return Promise.reject(error);
    }

    request._accessTokenRetried = true;
    request._skipAuthRefresh = true;
    try {
      if (!refreshInFlight) {
        refreshInFlight = refreshAccessToken().finally(() => {
          refreshInFlight = null;
        });
      }
      const newAccessToken = await refreshInFlight;
      request.headers.Authorization = `Bearer ${newAccessToken}`;
      request._skipAuthRefresh = false;
      return api(request);
    } catch (refreshError) {
      if (refreshError instanceof InvalidRefreshSessionError) {
        await expireLocalSession();
      }
      return Promise.reject(refreshError);
    }
  }
);

export default api;
