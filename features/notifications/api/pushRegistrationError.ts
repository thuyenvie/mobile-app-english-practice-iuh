import { isAxiosError } from "axios";

export function getPushRegistrationError(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) return "Không thể kết nối máy chủ thông báo. Hãy kiểm tra mạng và thử lại.";
    if (error.response.status === 401 || error.response.status === 403) {
      return "Máy chủ thông báo chưa xác thực được tài khoản. Lịch đã lưu nhưng thiết bị chưa được đăng ký nhận nhắc học. Vui lòng thử lại sau.";
    }
    if (error.response.status === 404 || error.response.status >= 500) {
      return "Dịch vụ thông báo tạm thời không khả dụng. Lịch đã lưu nhưng chưa thể đăng ký thiết bị. Vui lòng thử lại sau.";
    }
  }
  return "Chưa đăng ký được thiết bị nhận thông báo. Kiểm tra kết nối và thử lại.";
}
