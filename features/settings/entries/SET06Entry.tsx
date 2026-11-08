import { SettingsRow } from "../components/SettingsRow";
import type { SettingsEntryProps } from "../types";

export function SET06Entry({ theme }: SettingsEntryProps) {
  return <SettingsRow title="Bộ nhớ đệm" description="Chức năng quản lý bộ nhớ đệm tạm thời chưa khả dụng."
    theme={theme} unavailable />;
}
