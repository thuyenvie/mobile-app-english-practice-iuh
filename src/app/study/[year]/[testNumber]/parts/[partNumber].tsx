import ReadingPartScreen from "../../../../../../features/study/screens/ReadingPartScreen";
import ListeningPartScreen from "../../../../../../features/study/screens/ListeningPartScreen";
import { useLocalSearchParams } from "expo-router";

export default function PartScreen() {
  const { partNumber, year, testNumber } = useLocalSearchParams();
  return Number(partNumber) <= 4
    ? <ListeningPartScreen key={`${year}-${testNumber}`} />
    : <ReadingPartScreen />;
}
