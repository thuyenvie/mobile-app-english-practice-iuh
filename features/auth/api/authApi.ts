import axios from "axios";

import api from "@/lib/axios/axios";
import { saveAccessToken } from "@/lib/auth/tokenStorage";
import type { ApiResponse } from "@/types/api";

export interface LoginRequest {
  userName: string;
  passWord: string;
}

export interface LoginResult {
  token: string;
  success: boolean;
}

export async function login(request: LoginRequest): Promise<LoginResult> {
  const response = await api.post<ApiResponse<LoginResult>>(
    "/identity/auth/login",
    request,
  );
  const body = response.data;

  if (!body.success || !body.result?.success || !body.result.token) {
    throw new Error(body.message || "Đăng nhập không thành công.");
  }

  await saveAccessToken(body.result.token);
  return body.result;
}

export function getLoginErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    if (!error.response) {
      return "Không thể kết nối đến máy chủ. Hãy kiểm tra API Gateway và địa chỉ mạng.";
    }

    return error.response.data?.message || `Đăng nhập thất bại (${error.response.status}).`;
  }

  return error instanceof Error ? error.message : "Đăng nhập thất bại.";
}
