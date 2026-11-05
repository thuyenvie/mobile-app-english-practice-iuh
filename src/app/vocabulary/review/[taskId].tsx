import { RequireAccount } from "@/components/auth/RequireAccount";
import VocabularyTaskReviewScreen from "../../../../features/vocabulary/screens/VocabularyTaskReviewScreen";
export default function VocabularyReviewRoute() {
  return <RequireAccount title="Ôn từ vựng"><VocabularyTaskReviewScreen /></RequireAccount>;
}
