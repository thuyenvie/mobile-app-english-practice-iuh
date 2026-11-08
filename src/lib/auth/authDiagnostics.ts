import type { SessionStatus } from "./sessionStore";

type DiagnosticEvent = "request" | "response" | "refresh" | "session" | "credentials" | "updates";
interface DiagnosticFields {
  endpoint?: string;
  status?: number | null;
  code?: number;
  sessionBefore?: SessionStatus;
  sessionAfter?: SessionStatus;
  refresh?: "success" | "failure";
  hasAccessToken?: boolean;
  hasRefreshToken?: boolean;
  updatesAvailable?: boolean;
  updatesEnabled?: boolean;
  isEmbeddedLaunch?: boolean;
  channel?: string | null;
  runtimeVersion?: string | null;
  updateId?: string | null;
}

const endpoints = new Set([
  "/identity/auth/login", "/identity/auth/google", "/identity/auth/google/mobile",
  "/identity/auth/outbound/authentication", "/identity/auth/refresh", "/identity/auth/logout",
  "/identity/user/my-info", "/exam-service/study-sessions/me/active",
  "/exam-service/study-tasks", "/exam-service/study-plans/me",
  "/exam-service/study-plans/me/today", "/exam-service/study-plans/me/week",
  "/notification-service/push-tokens/me",
]);

// Never log query strings, credentials in URLs, account IDs, or arbitrary path segments.
function diagnosticEndpoint(url: string): string {
  const path = url.split(/[?#]/)[0].replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/api(?=\/)/, "").replace(/\/+$/, "");
  if (endpoints.has(path)) return path;
  for (const service of ["identity", "exam-service", "notification-service"]) {
    if (path.startsWith(`/${service}/`)) return `/${service}/[redacted]`;
  }
  return "[redacted]";
}

/** A strict allowlist: callers cannot accidentally serialize an Axios error or credentials. */
export function recordAuthDiagnostic(event: DiagnosticEvent, fields: DiagnosticFields = {}): void {
  try {
    if (!["request", "response", "refresh", "session", "credentials", "updates"].includes(event)) return;
    const safe: Record<string, string | number | boolean | null> = { event };
    if (typeof fields.endpoint === "string") safe.endpoint = diagnosticEndpoint(fields.endpoint);
    const status = fields.status;
    if (status === null || (typeof status === "number" && Number.isInteger(status) && status >= 0 && status <= 599)) {
      safe.status = status;
    }
    if (typeof fields.code === "number" && Number.isInteger(fields.code) && fields.code >= 0 && fields.code <= 9999) {
      safe.code = fields.code;
    }
    for (const key of ["sessionBefore", "sessionAfter"] as const) {
      const value = fields[key];
      if (value === "loading" || value === "guest" || value === "authenticated") safe[key] = value;
    }
    if (fields.refresh === "success" || fields.refresh === "failure") safe.refresh = fields.refresh;
    for (const key of ["hasAccessToken", "hasRefreshToken", "updatesAvailable", "updatesEnabled", "isEmbeddedLaunch"] as const) {
      if (typeof fields[key] === "boolean") safe[key] = fields[key];
    }
    if ("channel" in fields) {
      const channel = fields.channel;
      safe.channel = typeof channel === "string" && ["preview", "development", "production"].includes(channel) ? channel : null;
    }
    if ("runtimeVersion" in fields) {
      const runtime = fields.runtimeVersion;
      safe.runtimeVersion = typeof runtime === "string" && /^\d+\.\d+\.\d+$/.test(runtime) ? runtime : null;
    }
    if ("updateId" in fields) {
      const updateId = fields.updateId;
      safe.updateId = typeof updateId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updateId)
        ? updateId : null;
    }
    console.info("[auth-diagnostic]", JSON.stringify(safe));
  } catch {
    // Diagnostics must never interrupt login, storage, or request handling.
  }
}
