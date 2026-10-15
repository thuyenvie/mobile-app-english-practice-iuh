import type { PropsWithChildren } from "react";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { YStack } from "tamagui";

import { homeDesign } from "@/theme/tokens";

export function StudyScaffold({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets(); //để không bị che bởi tai thỏ, Dynamic Island hoặc cạnh thiết bị.

  return (
    <YStack
      flex={1}
      backgroundColor={homeDesign.colors.background}
      paddingTop={insets.top}
      paddingLeft={insets.left}
      paddingRight={insets.right}
    >
      <StatusBar style="light" />
      <YStack
        flex={1}
        width="100%"
        maxWidth={homeDesign.maxWidth}
        alignSelf="center"
      >
        {children}
      </YStack>
    </YStack>
  );
}
