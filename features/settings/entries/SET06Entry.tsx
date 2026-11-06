import { SettingsRow } from "../components/SettingsRow";
import type { SettingsEntryProps } from "../types";
import { useState } from "react";
import { CacheInventoryPanel } from "../components/CacheInventoryPanel";
import { useStudySession } from "../../study/session/StudySessionProvider";

export function SET06Entry({ theme }: SettingsEntryProps) {
  const [open, setOpen] = useState(false);
  const study = useStudySession();
  return open ? <CacheInventoryPanel theme={theme} activeStudy={study.busy || study.current?.status === "RUNNING"} onClose={() => setOpen(false)} /> :
    <SettingsRow title="Bộ nhớ đệm" description="Xem phạm vi và dữ liệu được giữ lại. Chưa bật xóa dữ liệu." theme={theme} unavailable={false} onPress={() => setOpen(true)} />;
}
