import { isAxiosError } from "axios";

import api from "@/lib/axios/axios";
import type { ExamPart } from "../types";

// ApiResponse của exam-service chưa có field success như identity-service.
interface ExamApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}

export async function getTestNumbersByYear(year: number): Promise<number[]> {
  const response = await api.get<ExamApiResponse<unknown>>(
    `/exam-service/exams/ets-${year}`
  );

  if (!Array.isArray(response.data.result)) {
    throw new Error("Dữ liệu danh sách đề không đúng định dạng.");
  }

  return response.data.result
    .filter((item): item is number => Number.isInteger(item))
    .sort((first, second) => first - second);
}

export async function getExamPart(
  year: number,
  testNumber: number,
  partNumber: number
): Promise<ExamPart> {
  const response = await api.get<ExamApiResponse<ExamPart>>(
    `/exam-service/exams/${year}/${testNumber}/parts/${partNumber}`
  );

  const part = response.data.result;
  if (!part || !Array.isArray(part.questions) || !Array.isArray(part.passages)) {
    throw new Error("Dữ liệu Part không đúng định dạng.");
  }

  return part;
}

export function getExamErrorMessage(error: unknown): string {
  if (isAxiosError<ExamApiResponse<unknown>>(error)) {
    if (!error.response) {
      return "Không thể kết nối API Gateway. Hãy kiểm tra địa chỉ mạng.";
    }

    if (error.response.status === 401) {
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    }

    if (error.response.status === 403) {
      return "Yêu cầu bị từ chối. Hãy kiểm tra quyền truy cập và cấu hình CORS.";
    }

    return (
      error.response.data?.message ||
      `Không thể tải đề (${error.response.status}).`
    );
  }

  return error instanceof Error ? error.message : "Không thể tải danh sách đề.";
}
