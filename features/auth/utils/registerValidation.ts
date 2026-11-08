export interface RegisterForm {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function validateRegisterForm(form: RegisterForm): string | null {
  const name = form.fullName.trim().replace(/\s+/g, " ");
  const email = form.email.trim();
  if (!name) return "Vui lòng nhập họ và tên.";
  if (name.length > 100) return "Họ và tên tối đa 100 ký tự.";
  if (!email) return "Vui lòng nhập email.";
  if (email.length > 254 || !/^[\x21-\x7e]+$/.test(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Email không hợp lệ.";
  if (!form.password.trim() || form.password.length < 8 || form.password.length > 72) {
    return "Mật khẩu cần có từ 8 đến 72 ký tự.";
  }
  const bytes = Array.from(form.password).reduce((size, character) => {
    const point = character.codePointAt(0)!;
    return size + (point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4);
  }, 0);
  if (bytes > 72) return "Mật khẩu không được vượt quá 72 byte UTF-8.";
  if (!form.confirmPassword) return "Vui lòng xác nhận mật khẩu.";
  if (form.password !== form.confirmPassword) return "Xác nhận mật khẩu không trùng khớp.";
  return null;
}
