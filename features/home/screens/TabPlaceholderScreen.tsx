import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo } from "react";
import { Text, YStack } from 'tamagui';


import { HomeScaffold } from '../components/HomeScaffold';

export function TabPlaceholderScreen({ title }: { title: string }) {
  const { homeDesign } = useThemedStyles();
  return (
    <HomeScaffold>
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$large">
        <Text role="heading" color={homeDesign.colors.text} fontSize={24} fontWeight="700">{title}</Text>
      </YStack>
    </HomeScaffold>
  );
}

function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { homeDesign } = appTheme;

    return { homeDesign };
  }, [appTheme]);
}
