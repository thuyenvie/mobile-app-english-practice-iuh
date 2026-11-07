import { isAxiosError } from "axios";
import api from "@/lib/axios/axios";
import type { ApiResponse } from "@/types/api";

export interface AccountProfile {
  firstName: string;
  lastName: string;
  dob: string | null;
  userName?: string;
}

export interface ProfileUpdate {
  firstName: string;
  lastName: string;
  dob: string | null;
}

export interface PasswordUpdate {
  currentPassword: string;
  newPassword: string;
}

function ensureSuccess<T>(response: ApiResponse<T>, fallback: string): T {
  if (!response.success) throw new Error(response.message || fallback);
  return response.result;
}

export async function getAccountProfile(generation: number): Promise<AccountProfile> {
  const { data } = await api.get<ApiResponse<AccountProfile>>("/identity/user/my-info", {
    sessionGeneration: generation,
  });
  return ensureSuccess(data, "Không thể tải thông tin cá nhân.");
}

export async function updateAccountProfile(
  input: ProfileUpdate,
  generation: number,
): Promise<AccountProfile> {
  const { data } = await api.put<ApiResponse<AccountProfile>>("/identity/user/my-info", input, {
    sessionGeneration: generation,
  });
  return ensureSuccess(data, "Không thể cập nhật thông tin cá nhân.");
}

export async function updateAccountPassword(
  input: PasswordUpdate,
  generation: number,
): Promise<void> {
  const { data } = await api.put<ApiResponse<null>>(
    "/identity/user/my-info/password",
    input,
    { sessionGeneration: generation },
  );
  ensureSuccess(data, "Không thể đổi mật khẩu.");
}

export function getAccountSettingsError(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const payload = error.response?.data as { message?: unknown } | undefined;
    if (typeof payload?.message === "string" && payload.message.trim()) return payload.message;
    if (error.response?.status === 401) return "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.";
    if (!error.response) return "Không thể kết nối máy chủ. Hãy kiểm tra kết nối rồi thử lại.";
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
