import FullTestScreen from "../../../../../features/study/screens/FullTestScreen";
import { useSession } from "@/lib/auth/useSession";
import { useIsFocused, useLocalSearchParams } from "expo-router";

export default function SelectedPartsPractice() {
  const session = useSession();
  const focused = useIsFocused();
  const { year, testNumber, parts } = useLocalSearchParams();
  if (session.status === "guest" && !focused) return null;
  return <FullTestScreen key={[year, testNumber, parts, session.generation].join(":")} practice />;
}
