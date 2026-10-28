import Screen from "../../../features/ai/screens/AiTutorScreen";
import { RequireAccount } from "@/components/auth/RequireAccount";

export default function ProtectedRoute() {
  return <RequireAccount title="Gia sư AI"><Screen /></RequireAccount>;
}
