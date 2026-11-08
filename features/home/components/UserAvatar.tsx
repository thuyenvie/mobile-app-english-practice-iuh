import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo, useState } from "react";

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image, YStack } from 'tamagui';
import { Platform } from 'react-native';



export function UserAvatar({ uri, name }: { uri?: string; name: string }) {
  const { homeDesign } = useThemedStyles();
  const [failedUri, setFailedUri] = useState<string>();
  return (
    <YStack width={60} height={60} borderRadius={30} overflow="hidden"
      backgroundColor={homeDesign.colors.tab} alignItems="center" justifyContent="center"
      {...(Platform.OS === 'web'
        ? { role: 'img' as const, 'aria-label': `Ảnh đại diện của ${name}` }
        : { accessible: true, accessibilityLabel: `Ảnh đại diện của ${name}` })}>
      {uri && failedUri !== uri ? (
        <Image source={{ uri }} width={60} height={60} onError={() => setFailedUri(uri)} />
      ) : (
        <MaterialIcons name="person" size={42} color={homeDesign.colors.cardText} />
      )}
    </YStack>
  );
}

function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { homeDesign } = appTheme;

    return { homeDesign };
  }, [appTheme]);
}
