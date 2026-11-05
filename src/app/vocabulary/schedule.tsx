import { RequireAccount } from "@/components/auth/RequireAccount";
import VocabularyScheduleScreen from "../../../features/vocabulary/screens/VocabularyScheduleScreen";
export default function VocabularyScheduleRoute() {
  return <RequireAccount title="Lên lịch ôn"><VocabularyScheduleScreen /></RequireAccount>;
}
