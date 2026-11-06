import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo, type PropsWithChildren } from "react";

import { router } from "expo-router";
import { Text, YStack } from "tamagui";
import { AppButton } from "@/components/ui/AppButton";
import { useSession } from "@/lib/auth/useSession";


export function RequireAccount({ children, title = "Chức năng này" }: PropsWithChildren<{ title?: string }>) {
  const { homeDesign } = useThemedStyles();
  const session = useSession();
  if (session.status !== "authenticated") {
    return <YStack flex={1} padding={24} gap={16} alignItems="center" justifyContent="center" backgroundColor={homeDesign.colors.background}>
      <Text color={homeDesign.colors.text} textAlign="center">{title} yêu cầu đăng nhập.</Text>
      <AppButton onPress={() => router.push("/auth/login")}>Đăng nhập</AppButton>
      <AppButton appearance="text" onPress={() => router.replace("/(tabs)/home")}>Về Trang chủ</AppButton>
    </YStack>;
  }
  return children;
}

function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { homeDesign } = appTheme;

    return { homeDesign };
  }, [appTheme]);
}
