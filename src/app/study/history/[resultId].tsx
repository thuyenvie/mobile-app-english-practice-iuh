import Screen from "../../../../features/study/screens/ListeningReviewScreen";
import { RequireAccount } from "@/components/auth/RequireAccount";

export default function ProtectedRoute() {
  return <RequireAccount title="Kết quả đã lưu"><Screen /></RequireAccount>;
}
