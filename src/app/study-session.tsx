import StudySessionScreen from "../../features/study/session/StudySessionScreen";
import { RequireAccount } from "@/components/auth/RequireAccount";
export default function StudySessionRoute() {
  return <RequireAccount title="Phiên học"><StudySessionScreen /></RequireAccount>;
}
