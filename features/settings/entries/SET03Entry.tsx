import { SettingsRow } from "../components/SettingsRow";
import type { SettingsEntryProps } from "../types";

export function SET03Entry({ theme }: SettingsEntryProps) {
  return <SettingsRow title="Nhắc nhở học tập" description="Cài đặt nhắc học tại đây chưa khả dụng." theme={theme} unavailable />;
}
