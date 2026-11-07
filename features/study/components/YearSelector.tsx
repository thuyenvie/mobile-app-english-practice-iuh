import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo } from "react";
import { ScrollView } from "react-native";
import { Text, XStack } from "tamagui";

import { AppButton } from "@/components/ui/AppButton";


export function YearSelector({
  years,
  selectedYear,
  onSelect,
}: {
  years: readonly number[];
  selectedYear: number;
  onSelect: (year: number) => void;
}) {
  const { homeDesign } = useThemedStyles();
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
              backgroundColor={
                selected
                  ? homeDesign.colors.tabActive
                  : homeDesign.colors.surfaceRaised
              }
              color={
                selected ? homeDesign.colors.onSelection : homeDesign.colors.text
              }
              accessibilityState={{ selected }}
              onPress={() => onSelect(year)}
            >
              <Text color="inherit" fontWeight="700">
                ETS {year}
              </Text>
            </AppButton>
          );
        })}
      </XStack>
    </ScrollView>
  );
}

function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { homeDesign } = appTheme;

    return { homeDesign };
  }, [appTheme]);
}
