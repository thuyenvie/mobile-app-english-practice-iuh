import api from "@/lib/axios/axios";
import { getAccessToken, getRefreshToken } from "./tokenStorage";
import { authenticateSession, enterGuestSession, getSessionSnapshot, sessionUnavailable } from "./sessionStore";

let restoring: Promise<void> | null = null;
export function restoreSession(): Promise<void> {
  if (restoring) return restoring;
  if (getSessionSnapshot().status !== "loading") return Promise.resolve();
  const generation = getSessionSnapshot().generation;
  restoring = (async () => {
    try {
      const [access, refresh] = await Promise.all([getAccessToken(), getRefreshToken()]);
      if (getSessionSnapshot().generation !== generation) return;
      if (!access && !refresh) {
        enterGuestSession();
        return;
      }
      // Verification is server-side. Axios can rotate the token pair on a 401.
      const response = await api.get<{ success: boolean; result?: { userName?: string } }>("/identity/user/my-info");
      if (getSessionSnapshot().generation !== generation) return;
      const subject = response.data.result?.userName;
      if (!response.data.success || !subject) throw new Error("Không xác minh được thông tin phiên.");
      authenticateSession(subject);
    } catch {
      if (getSessionSnapshot().generation === generation) {
        sessionUnavailable("Chưa thể kiểm tra phiên đăng nhập. Thông tin phiên được giữ nguyên; hãy kiểm tra mạng và thử lại.");
      }
    }
  })().finally(() => { restoring = null; });
  return restoring;
}
