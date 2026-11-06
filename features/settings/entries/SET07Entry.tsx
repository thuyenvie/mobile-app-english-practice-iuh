import { SettingsRow } from "../components/SettingsRow";
import type { SettingsEntryProps } from "../types";
import { router } from "expo-router";

export function SET07Entry({ theme }: SettingsEntryProps) {
  return <SettingsRow title="Giới thiệu ứng dụng" description="Phiên bản và thông tin ứng dụng." theme={theme} unavailable={false} onPress={() => router.push("/settings/about")} />;
}
