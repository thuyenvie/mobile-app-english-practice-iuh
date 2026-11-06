import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo, type PropsWithChildren } from "react";
import { usePathname } from "expo-router";
import { StudySessionBanner, RefreshStudySessionOnFocus } from "../session/StudySessionControls";

import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { YStack } from "tamagui";



export function StudyScaffold({ children }: PropsWithChildren) {
  const { homeDesign, statusBarStyle } = useThemedStyles();
  const pathname = usePathname();
  const insets = useSafeAreaInsets(); //để không bị che bởi tai thỏ, Dynamic Island hoặc cạnh thiết bị.

  return (
    <YStack
      flex={1}
      backgroundColor={homeDesign.colors.background}
      paddingTop={insets.top}
      paddingLeft={insets.left}
      paddingRight={insets.right}
    >
      <StatusBar style={statusBarStyle} />
      <YStack
        flex={1}
        width="100%"
        maxWidth={homeDesign.maxWidth}
        alignSelf="center"
      >
        <RefreshStudySessionOnFocus />
        {pathname !== "/study-session" ? <StudySessionBanner /> : null}
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
