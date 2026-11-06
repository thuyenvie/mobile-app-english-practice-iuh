import { SettingsRow } from "../components/SettingsRow";
import type { SettingsEntryProps } from "../types";

export function SET08Entry({ theme }: SettingsEntryProps) {
  return <SettingsRow title="Gửi phản hồi / Báo lỗi" description="Chức năng gửi phản hồi chưa khả dụng." theme={theme} unavailable />;
}
