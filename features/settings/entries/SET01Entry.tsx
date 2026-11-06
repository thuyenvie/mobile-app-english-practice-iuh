import { SettingsRow } from "../components/SettingsRow";
import type { SettingsEntryProps } from "../types";

export function SET01Entry({ theme }: SettingsEntryProps) {
  return <SettingsRow title="Giao diện" description="Tùy chọn Sáng, Tối và Hệ thống chưa khả dụng." theme={theme} unavailable />;
}
