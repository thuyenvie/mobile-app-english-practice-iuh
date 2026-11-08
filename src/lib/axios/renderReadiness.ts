import { create, isAxiosError } from "axios";

const readyForMs = 5 * 60_000;
// Render Free cold starts in the provided service logs took up to ~157 seconds.
const maxWaitMs = 4 * 60_000;
const probeTimeoutMs = 30_000;
const retryDelayMs = 5_000;
const probes = create({ headers: { Accept: "application/json" } });
const services = new Map<string, { readyAt: number; pending?: Promise<void> }>();

// Render Free ngu khi khong dung. Cho GET an toan san sang truoc khi gui POST.
export async function waitForRenderService(baseURL: string, requestPath = ""): Promise<void> {
  if (!/^https:\/\/[^/]+\.onrender\.com(?:\/|$)/i.test(baseURL)) return;
  const service = requestPath.startsWith("/identity/") ? "identity"
    : requestPath.startsWith("/exam-service/") ? "exam" : null;
  if (!service) return;

  const key = `${baseURL}:${service}`;
  let state = services.get(key);
  if (!state) {
    state = { readyAt: 0 };
    services.set(key, state);
  }
  if (Date.now() - state.readyAt < readyForMs) return;
  if (state.pending) return state.pending;

  const current = state;
  const path = service === "identity" ? "/identity/auth/login" : "/exam-service/v3/api-docs";
  current.pending = (async () => {
    const deadline = Date.now() + maxWaitMs;
    while (Date.now() < deadline) {
      try {
        const response = await probes.get<unknown>(`${baseURL.replace(/\/+$/, "")}${path}`, {
          timeout: Math.min(probeTimeoutMs, deadline - Date.now()),
          validateStatus: () => true,
        });
        // GET login khong dang nhap: 401/405 xac nhan Identity da chay, khong tao token.
        const ready = service === "identity"
          ? response.status === 401 || response.status === 405
          : response.status === 200 && String(response.headers["content-type"]).includes("application/json");
        if (ready) {
          current.readyAt = Date.now();
          return;
        }
        if (![408, 429, 502, 503, 504].includes(response.status)) {
          throw new Error(`Máy chủ ${service} chưa sẵn sàng (HTTP ${response.status}).`);
        }
      } catch (error: unknown) {
        if (!isAxiosError(error)) throw error;
      }
      const remaining = deadline - Date.now();
      if (remaining > 0) await new Promise<void>(resolve => setTimeout(resolve, Math.min(retryDelayMs, remaining)));
    }
    throw new Error("Máy chủ Render chưa sẵn sàng sau 4 phút. Vui lòng kiểm tra trạng thái service và thử lại.");
  })().finally(() => { current.pending = undefined; });
  return current.pending;
}

export function invalidateRenderService(baseURL: string, path = "") {
  const service = path.startsWith("/identity/") ? "identity"
    : path.startsWith("/exam-service/") ? "exam" : null;
  const state = services.get(`${baseURL}:${service}`);
  if (state) state.readyAt = 0;
}
