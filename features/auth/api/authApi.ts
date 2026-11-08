import { isAxiosError } from "axios";

import api from "@/lib/axios/axios";
import { saveTokenPair } from "@/lib/auth/tokenStorage";
import { authenticateSession, getSessionSnapshot, readTokenSubject } from "@/lib/auth/sessionStore";
import type { ApiResponse } from "@/types/api";

export interface LoginRequest {
  userName: string;
  passWord: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

export async function register(request: RegisterRequest): Promise<void> {
  const response = await api.post<ApiResponse<{ userName: string }>>(
    "/identity/auth/register",
    { ...request, fullName: request.fullName.trim().replace(/\s+/g, " "), email: request.email.trim().toLowerCase() },
  );
  if (!response.data.success || response.data.code !== 201 || !response.data.result?.userName) {
    throw new Error(response.data.message || "Đăng ký không thành công. Vui lòng thử lại.");
  }
}

export function getRegisterErrorMessage(error: unknown): string {
  if (isAxiosError<ApiResponse<unknown>>(error)) {
    if (!error.response) return "Không thể kết nối đến máy chủ. Hãy kiểm tra kết nối mạng và thử lại.";
    if (error.response.status === 409) return "Email đã tồn tại. Vui lòng dùng email khác hoặc đăng nhập.";
    if (error.response.status === 400) return error.response.data?.message || "Dữ liệu đăng ký không hợp lệ.";
    return "Chưa thể tạo tài khoản. Vui lòng thử lại sau.";
  }
  return error instanceof Error ? error.message : "Đăng ký không thành công. Vui lòng thử lại.";
}

export interface LoginResult {
  token: string;
  success: boolean;
  refreshToken: string;
}

export async function loginWithGoogleIdToken(
  idToken: string
): Promise<LoginResult> {
  const generation = getSessionSnapshot().generation;
  const response = await api.post<ApiResponse<LoginResult>>(
    // Identity service nhận Google ID token, tự tạo/tìm user và trả JWT hệ thống.
    "/identity/auth/google",
    { idToken }
  );
  const body = response.data;

  if (
    !body.success ||
    !body.result?.success ||
    !body.result.token ||
    !body.result.refreshToken
  ) {
    throw new Error(body.message || "Đăng nhập Google không thành công.");
  }

  const subject = readTokenSubject(body.result.token);
  await saveTokenPair(body.result.token, body.result.refreshToken, {
    generation, onSaved: () => authenticateSession(subject),
  });
  return body.result;
}

export async function login(request: LoginRequest): Promise<LoginResult> {
  const generation = getSessionSnapshot().generation;
  const response = await api.post<ApiResponse<LoginResult>>(
    "/identity/auth/login",
    request
  );
  const body = response.data;

  if (
    !body.success ||
    !body.result?.success ||
    !body.result.token ||
    !body.result.refreshToken
  ) {
    throw new Error(body.message || "Đăng nhập không thành công.");
  }

  const subject = readTokenSubject(body.result.token);
  await saveTokenPair(body.result.token, body.result.refreshToken, {
    generation, onSaved: () => authenticateSession(subject),
  });
  return body.result;
}

export async function logout(token: string): Promise<void> {
  const response = await api.post<ApiResponse<null>>(
    "/identity/auth/logout",
    { token },
    { timeout: 8_000 },
  );

  if (!response.data.success) {
    throw new Error(response.data.message || "Đăng xuất không thành công.");
  }
}

export function getLoginErrorMessage(error: unknown): string {
  if (isAxiosError<ApiResponse<unknown>>(error)) {
    if (!error.response) {
      return "Không thể kết nối đến máy chủ. Hãy kiểm tra API Gateway và địa chỉ mạng.";
    }

    return (
      error.response.data?.message ||
      `Đăng nhập thất bại (${error.response.status}).`
    );
  }

  return error instanceof Error ? error.message : "Đăng nhập thất bại.";
}
