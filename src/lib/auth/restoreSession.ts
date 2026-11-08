import api from "@/lib/axios/axios";
import { getAccessToken, getRefreshToken } from "./tokenStorage";
import { authenticateSession, enterGuestSession, getSessionSnapshot, setSessionRestoreError } from "./sessionStore";
import { recordAuthDiagnostic } from "./authDiagnostics";

let restoring: Promise<void> | null = null;
export const SESSION_RESTORE_TIMEOUT_MS = 15_000;

export function restoreSession(): Promise<void> {
  if (restoring) return restoring;
  if (getSessionSnapshot().status !== "loading") return Promise.resolve();
  const generation = getSessionSnapshot().generation;
  const controller = new AbortController();
  let expired = false;
  let timer: ReturnType<typeof setTimeout>;
  const isCurrent = () => !expired && getSessionSnapshot().generation === generation;
  setSessionRestoreError(null);
  const verification = (async () => {
    const [access, refresh] = await Promise.all([getAccessToken(), getRefreshToken()]);
    if (!isCurrent()) return;
    recordAuthDiagnostic("credentials", { hasAccessToken: !!access, hasRefreshToken: !!refresh });
    if (!access && !refresh) {
      enterGuestSession();
      return;
    }
    // Verification is server-side. Axios can rotate the token pair on a 401.
    const response = await api.get<{ success: boolean; result?: { userName?: string } }>(
      "/identity/user/my-info", { signal: controller.signal, sessionGeneration: generation },
    );
    if (!isCurrent()) return;
    const subject = response.data.result?.userName;
    if (!response.data.success || !subject) throw new Error("Không xác minh được thông tin phiên.");
    authenticateSession(subject);
  })();
  // Axios timeouts do not cover SecureStore reads or the complete refresh/retry chain.
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      expired = true;
      controller.abort();
      reject(new Error("Session verification timed out."));
    }, SESSION_RESTORE_TIMEOUT_MS);
  });
  restoring = Promise.race([verification, deadline]).catch(() => {
    if (getSessionSnapshot().generation === generation) {
      setSessionRestoreError("Chưa thể kết nối để kiểm tra phiên đăng nhập. Bạn có thể thử lại hoặc vào trang chủ với chế độ khách. Thông tin đăng nhập vẫn được giữ trên thiết bị.");
    }
  }).finally(() => {
    clearTimeout(timer);
    restoring = null;
  });
  return restoring;
}
