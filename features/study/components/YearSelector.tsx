import { ScrollView } from "react-native";
import { Text, XStack } from "tamagui";

import { AppButton } from "@/components/ui/AppButton";
import { homeDesign } from "@/theme/tokens";

export function YearSelector({
  years,
  selectedYear,
  onSelect,
}: {
  years: readonly number[];
  selectedYear: number;
  onSelect: (year: number) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <XStack gap={10}>
        {years.map((year) => {
          const selected = year === selectedYear;
          return (
            <AppButton
              key={year}
              appearance="text"
              minWidth={92}
              minHeight={42}
              paddingHorizontal={16}
              borderRadius={21}
              backgroundColor={selected ? homeDesign.colors.tabActive : homeDesign.colors.surfaceRaised}
              color={selected ? homeDesign.colors.cardText : homeDesign.colors.text}
              accessibilityState={{ selected }}
              onPress={() => onSelect(year)}
            >
              <Text color="inherit" fontWeight="700">ETS {year}</Text>
            </AppButton>
          );
        })}
      </XStack>
    </ScrollView>
  );
}
