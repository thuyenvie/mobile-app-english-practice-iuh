import Screen from "../../../../features/study/screens/ListeningHistoryScreen";
import { RequireAccount } from "@/components/auth/RequireAccount";

export default function ProtectedRoute() {
  return <RequireAccount title="Lịch sử bài làm"><Screen /></RequireAccount>;
}
