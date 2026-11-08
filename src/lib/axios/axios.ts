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
import { assertSessionGeneration, enterGuestSession, getSessionSnapshot, type SessionStatus } from "@/lib/auth/sessionStore";
import { recordAuthDiagnostic } from "@/lib/auth/authDiagnostics";

declare module "axios" {
  interface AxiosRequestConfig {
    sessionGeneration?: number;
    _authSessionBefore?: SessionStatus;
    _authHasAccessToken?: boolean;
    _authHasRefreshToken?: boolean;
  }
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

function traceHttp(client: ReturnType<typeof create>) {
  client.interceptors.request.use(config => {
    config._authSessionBefore = getSessionSnapshot().status;
    recordAuthDiagnostic("request", {
      endpoint: config.url,
      sessionBefore: config._authSessionBefore,
      hasAccessToken: config._authHasAccessToken,
      hasRefreshToken: config._authHasRefreshToken,
    });
    return config;
  });
  client.interceptors.response.use(response => {
    recordAuthDiagnostic("response", {
      endpoint: response.config.url, status: response.status,
      code: response.data?.code,
      sessionBefore: response.config._authSessionBefore, sessionAfter: getSessionSnapshot().status,
    });
    return response;
  }, (error: unknown) => {
    if (isAxiosError(error)) recordAuthDiagnostic("response", {
      endpoint: error.config?.url, status: error.response?.status ?? null,
      code: error.response?.data?.code,
      sessionBefore: error.config?._authSessionBefore, sessionAfter: getSessionSnapshot().status,
    });
    return Promise.reject(error);
  });
}
traceHttp(api);
traceHttp(publicApi);
traceHttp(refreshClient);

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
type IdentityValidity = "valid" | "invalid" | "mismatch" | "unavailable";
let identityCheckInFlight: {
  generation: number; accessToken: string | null; promise: Promise<IdentityValidity>;
} | null = null;
let identityCache: {
  generation: number; accessToken: string | null; validity: IdentityValidity; until: number;
} | null = null;
let refreshCooldown: { generation: number; accessToken: string | null; until: number } | null = null;

function verificationDeadline(accessToken: string | null, duration: number): number {
  const deadline = Date.now() + duration;
  try {
    const payload = accessToken?.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
    if (!payload) return deadline;
    const expiry: unknown = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "="))).exp;
    // Unverified claims only shorten the cache lifetime; they never authorize a request.
    return typeof expiry === "number" && Number.isFinite(expiry) ? Math.min(deadline, expiry * 1000) : deadline;
  } catch {
    return deadline;
  }
}

async function verifyIdentitySession(generation: number, accessToken: string | null): Promise<IdentityValidity> {
  let validity: IdentityValidity = "unavailable";
  try {
    assertSessionGeneration(generation);
    if (!accessToken) return "unavailable";
    await waitForRenderService(API_BASE_URL, "/identity/user/my-info");
    assertSessionGeneration(generation);
    // This client has no refresh interceptor: verification cannot recursively refresh.
    const response = await refreshClient.get<{ success: boolean; result?: { userName?: string } }>(
      "/identity/user/my-info", {
        headers: { Authorization: `Bearer ${accessToken}` },
        sessionGeneration: generation, _authHasAccessToken: true,
      },
    );
    assertSessionGeneration(generation);
    const subject = response.data.result?.userName;
    if (response.data.success !== true || typeof subject !== "string" || !subject) return "unavailable";
    const current = getSessionSnapshot();
    validity = current.subject && current.subject !== subject ? "mismatch" : "valid";
  } catch (error) {
    assertSessionGeneration(generation);
    // A permission error, outage, or malformed response is not proof of an expired session.
    if (!isAxiosError(error) || error.response?.status !== 401) return "unavailable";
    validity = "invalid";
  }
  try {
    const latestAccessToken = await getAccessToken();
    assertSessionGeneration(generation);
    // Another refresh may rotate credentials without changing the account generation.
    return latestAccessToken === accessToken ? validity : "unavailable";
  } catch {
    assertSessionGeneration(generation);
    return "unavailable";
  }
}

async function checkIdentitySession(generation: number): Promise<IdentityValidity> {
  const accessToken = await getAccessToken();
  assertSessionGeneration(generation);
  if (!accessToken) return "invalid"; // A stored refresh token can restore a missing access token.
  if (identityCache?.generation === generation && identityCache.accessToken === accessToken && identityCache.until > Date.now()) {
    return identityCache.validity;
  }
  if (!identityCheckInFlight || identityCheckInFlight.generation !== generation || identityCheckInFlight.accessToken !== accessToken) {
    const pending = { generation, accessToken, promise: verifyIdentitySession(generation, accessToken).then(validity => {
      assertSessionGeneration(generation);
      if (validity === "valid" || validity === "unavailable") {
        identityCache = { generation, accessToken, validity,
          until: validity === "valid" ? verificationDeadline(accessToken, 30_000) : Date.now() + 5_000 };
      }
      return validity;
    }) };
    identityCheckInFlight = pending;
    void pending.promise.finally(() => {
      if (identityCheckInFlight === pending) identityCheckInFlight = null;
    }).catch(() => undefined);
  }
  return identityCheckInFlight.promise;
}

async function refreshOrReuseAccessToken(generation: number, failedToken: string | null): Promise<string> {
  const latest = await getAccessToken();
  assertSessionGeneration(generation);
  // Another request may have completed refresh after this request was rejected.
  if (latest && latest !== failedToken) return latest;
  if (refreshCooldown?.generation === generation && refreshCooldown.accessToken === latest && refreshCooldown.until > Date.now()) {
    throw new RefreshUnavailableError();
  }
  if (!refreshInFlight || refreshInFlight.generation !== generation) {
    const pending = { generation, promise: refreshAccessToken(generation).catch(error => {
      if (error instanceof RefreshUnavailableError) {
        refreshCooldown = { generation, accessToken: latest, until: Date.now() + 5_000 };
      }
      throw error;
    }) };
    refreshInFlight = pending;
    void pending.promise.finally(() => {
      if (refreshInFlight === pending) refreshInFlight = null;
    }).catch(() => undefined);
  }
  return refreshInFlight.promise;
}

async function refreshAccessToken(generation: number): Promise<string> {
  const sessionBefore = getSessionSnapshot().status;
  try {
    assertSessionGeneration(generation);
    await waitForRenderService(API_BASE_URL, "/identity/auth/refresh");
    assertSessionGeneration(generation);
    const refreshToken = await getRefreshToken();
    assertSessionGeneration(generation);
    recordAuthDiagnostic("credentials", { hasRefreshToken: !!refreshToken });
    if (!refreshToken) throw new InvalidRefreshSessionError();
    const response = await refreshClient.post<AuthEnvelope>(
      "/identity/auth/refresh",
      { refreshToken },
      { sessionGeneration: generation, _authHasRefreshToken: true },
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
    recordAuthDiagnostic("refresh", {
      refresh: "success", hasAccessToken: true, hasRefreshToken: true,
      sessionBefore, sessionAfter: getSessionSnapshot().status,
    });
    return result.token;
  } catch (error) {
    recordAuthDiagnostic("refresh", { refresh: "failure", sessionBefore, sessionAfter: getSessionSnapshot().status });
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
  config._authHasAccessToken = !!token;
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

    const authorization = request.headers.get("Authorization");
    const failedToken = typeof authorization === "string" && authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
    const latestToken = await getAccessToken();
    assertSessionGeneration(generation);
    if (latestToken && latestToken !== failedToken) {
      if (request._accessTokenRetried) return Promise.reject(error);
      request._accessTokenRetried = true;
      request.headers.Authorization = `Bearer ${latestToken}`;
      return api(request);
    }

    // A downstream denial is not proof that the Identity session has expired.
    if (request._accessTokenRetried) {
      const validity = requestPath === "/identity/user/my-info" ? "invalid" : await checkIdentitySession(generation);
      if (validity === "invalid" || validity === "mismatch") {
        await expireLocalSession(generation);
      }
      return Promise.reject(error);
    }

    if (refreshCooldown?.generation === generation && refreshCooldown.accessToken === latestToken && refreshCooldown.until > Date.now()) {
      return Promise.reject(new RefreshUnavailableError());
    }
    if (requestPath !== "/identity/user/my-info") {
      const validity = await checkIdentitySession(generation);
      if (validity === "mismatch") await expireLocalSession(generation);
      if (validity !== "invalid") return Promise.reject(error);
    } else {
      identityCache = null; // A direct Identity rejection overrides cached verification.
    }

    request._accessTokenRetried = true;
    request._skipAuthRefresh = true;
    try {
      const newAccessToken = await refreshOrReuseAccessToken(generation, failedToken);
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
