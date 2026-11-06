import { SettingsRow } from "../components/SettingsRow";
import type { SettingsEntryProps } from "../types";

export function SET04Entry({ theme }: SettingsEntryProps) {
  return <SettingsRow title="Thông tin cá nhân" description="Chỉnh sửa thông tin cá nhân chưa khả dụng." theme={theme} unavailable />;
}
