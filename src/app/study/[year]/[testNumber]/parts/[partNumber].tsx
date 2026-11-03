import ReadingPartScreen from "../../../../../../features/study/screens/ReadingPartScreen";
import ListeningPartScreen from "../../../../../../features/study/screens/ListeningPartScreen";
import { useSession } from "@/lib/auth/useSession";
import { useIsFocused, useLocalSearchParams } from "expo-router";

export default function PartScreen() {
  const session = useSession();
  const focused = useIsFocused();
  const { partNumber, year, testNumber } = useLocalSearchParams();
  if (session.status === "guest" && !focused) return null;
  return Number(partNumber) <= 4
    ? <ListeningPartScreen key={`${year}-${testNumber}`} />
    : <ReadingPartScreen key={[year, testNumber, partNumber, session.generation].join("-")} />;
}
