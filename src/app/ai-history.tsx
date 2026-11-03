import Screen from "../../features/ai/screens/AiHistoryScreen";
import { RequireAccount } from "@/components/auth/RequireAccount";

export default function ProtectedRoute() {
  return <RequireAccount title="Lịch sử AI"><Screen /></RequireAccount>;
}
