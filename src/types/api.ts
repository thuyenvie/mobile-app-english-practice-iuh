export interface ApiResponse<T> {
  code: number;
  message: string;
  success: boolean;
  result: T;
}
