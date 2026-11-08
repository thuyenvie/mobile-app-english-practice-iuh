import { create, isAxiosError, type InternalAxiosRequestConfig } from "axios";
import { Platform } from "react-native";
import { invalidateRenderService, waitForRenderService } from "./renderReadiness";

import {
  getAccessToken,
  getRefreshToken,
  removeTokens,
  saveTokenPair,
} from "@/lib/auth/tokenStorage";
import { notifySessionExpired } from "@/lib/auth/sessionEvents";
import { assertSessionGeneration, enterGuestSession, getSessionSnapshot } from "@/lib/auth/sessionStore";

declare module "axios" {
  interface AxiosRequestConfig { sessionGeneration?: number; }
}

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

// Public practice never attaches account credentials, even if storage still contains a token.
export const publicApi = create({
  baseURL: API_BASE_URL, timeout: 30_000, headers: { Accept: "application/json" },
});
publicApi.interceptors.request.use(async config => {
  config.sessionGeneration ??= getSessionSnapshot().generation;
  assertSessionGeneration(config.sessionGeneration);
  await waitForRenderService(API_BASE_URL, config.url);
  assertSessionGeneration(config.sessionGeneration);
  config.headers.delete("Authorization");
  return config;
});
publicApi.interceptors.response.use(response => {
  assertSessionGeneration(response.config.sessionGeneration ?? -1);
  return response;
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
  _transientRetryCount?: number;
};

const MAX_TRANSIENT_RETRIES = 2;

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

let refreshInFlight: { generation: number; promise: Promise<string> } | null = null;

async function refreshAccessToken(generation: number): Promise<string> {
  assertSessionGeneration(generation);
  const refreshToken = await getRefreshToken();
  assertSessionGeneration(generation);
  if (!refreshToken) throw new InvalidRefreshSessionError();

  try {
    await waitForRenderService(API_BASE_URL, "/identity/auth/refresh");
    assertSessionGeneration(generation);
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
    await saveTokenPair(result.token, result.refreshToken, { generation });
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

async function expireLocalSession(generation: number): Promise<void> {
  assertSessionGeneration(generation);
  await removeTokens({ generation, onSaved: () => {
    enterGuestSession();
    notifySessionExpired();
  } });
}

const loginEndpoints = new Set([
  "/identity/auth/login",
  "/identity/auth/google",
  "/identity/auth/google/mobile",
  "/identity/auth/outbound/authentication",
  "/identity/auth/refresh",
]);

api.interceptors.request.use(async (config) => {
  config.sessionGeneration ??= getSessionSnapshot().generation;
  assertSessionGeneration(config.sessionGeneration);
  // API co JWT con can Identity thuc de Gateway kiem tra token.
  await Promise.all([
    waitForRenderService(API_BASE_URL, "/identity/auth/login"),
    waitForRenderService(API_BASE_URL, config.url),
  ]);
  assertSessionGeneration(config.sessionGeneration);
  const requestPath = config.url?.split("?")[0].replace(/\/+$/, "");
  if (
    config.method?.toLowerCase() === "post" &&
    loginEndpoints.has(requestPath ?? "")
  ) {
    config.headers.delete("Authorization");
    return config;
  }

  if (getSessionSnapshot().status === "guest") {
    throw new Error("Vui lòng đăng nhập để sử dụng chức năng này.");
  }
  const token = await getAccessToken();
  assertSessionGeneration(config.sessionGeneration);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => {
    assertSessionGeneration(response.config.sessionGeneration ?? -1);
    return response;
  },
  async (error: unknown) => {
    if (isAxiosError(error) && error.config?.sessionGeneration !== undefined) {
      assertSessionGeneration(error.config.sessionGeneration);
    }

    // Render Free co the tra loi cham hoac 502 tam thoi khi service dang khoi dong.
    // Chi thu lai GET/HEAD de tranh gui lap cac thao tac ghi du lieu.
    if (isAxiosError(error) && error.config) {
      const request = error.config as RetriableRequest;
      const method = request.method?.toLowerCase();
      const status = error.response?.status;
      const retryableStatus = [408, 429, 502, 503, 504].includes(status ?? 0);
      const canRetry =
        (method === "get" || method === "head") &&
        (!error.response || retryableStatus) &&
        (request._transientRetryCount ?? 0) < MAX_TRANSIENT_RETRIES;

      if (canRetry) {
        invalidateRenderService(API_BASE_URL, request.url);
        if (request.sessionGeneration !== undefined) {
          assertSessionGeneration(request.sessionGeneration);
        }
        const retryCount = request._transientRetryCount ?? 0;
        request._transientRetryCount = retryCount + 1;
        await new Promise((resolve) => setTimeout(resolve, retryCount === 0 ? 800 : 1600));
        if (request.sessionGeneration !== undefined) {
          assertSessionGeneration(request.sessionGeneration);
        }
        return api(request);
      }
    }

    if (
      !isAxiosError(error) ||
      error.response?.status !== 401 ||
      !error.config
    ) {
      return Promise.reject(error);
    }

    const request = error.config as RetriableRequest;
    const generation = request.sessionGeneration ?? -1;
    assertSessionGeneration(generation);
    const requestPath = request.url?.split("?")[0].replace(/\/+$/, "");
    if (request._skipAuthRefresh || loginEndpoints.has(requestPath ?? "")) {
      return Promise.reject(error);
    }

    // A retried request failing with 401 means the new access token cannot authorize this API.
    if (request._accessTokenRetried) {
      await expireLocalSession(generation);
      return Promise.reject(error);
    }

    request._accessTokenRetried = true;
    request._skipAuthRefresh = true;
    try {
      if (!refreshInFlight || refreshInFlight.generation !== generation) {
        const pending = { generation, promise: refreshAccessToken(generation) };
        refreshInFlight = pending;
        void pending.promise.finally(() => {
          if (refreshInFlight === pending) refreshInFlight = null;
        }).catch(() => undefined);
      }
      const newAccessToken = await refreshInFlight.promise;
      assertSessionGeneration(generation);
      request.headers.Authorization = `Bearer ${newAccessToken}`;
      request._skipAuthRefresh = false;
      return api(request);
    } catch (refreshError) {
      if (refreshError instanceof InvalidRefreshSessionError) {
        await expireLocalSession(generation);
      }
      return Promise.reject(refreshError);
    }
  }
);

export default api;
