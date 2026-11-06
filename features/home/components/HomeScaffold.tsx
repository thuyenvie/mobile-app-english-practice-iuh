import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo, type PropsWithChildren } from "react";

import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';



export function HomeScaffold({ children, bottomInset = false }: PropsWithChildren<{ bottomInset?: boolean }>) {
  const { homeDesign, statusBarStyle } = useThemedStyles();
  const insets = useSafeAreaInsets();
  return (
    <YStack flex={1} backgroundColor={homeDesign.colors.background}
      paddingTop={insets.top} paddingBottom={bottomInset ? insets.bottom : 0}
      paddingLeft={insets.left} paddingRight={insets.right}>
      <StatusBar style={statusBarStyle} />
      <YStack flex={1} width="100%" maxWidth={homeDesign.maxWidth} alignSelf="center">
        {children}
      </YStack>
    </YStack>
  );
}

function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { homeDesign, statusBarStyle } = appTheme;

    return { homeDesign, statusBarStyle };
  }, [appTheme]);
}
