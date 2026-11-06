import { SettingsRow } from "../components/SettingsRow";
import type { SettingsEntryProps } from "../types";

export function SET05Entry({ theme }: SettingsEntryProps) {
  return <SettingsRow title="Đổi mật khẩu" description="Chức năng đổi mật khẩu chưa khả dụng." theme={theme} unavailable />;
}
