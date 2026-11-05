import { BrandedPageState } from "@/components/ui/BrandedPageState";
import { Stack, useNavigationContainerRef, type ErrorBoundaryProps } from "expo-router";
import { useEffect } from "react";
import { Alert, BackHandler, Platform } from "react-native";
import { SessionProvider } from "@/providers/SessionProvider";
import { TamaguiProvider } from "tamagui";

import { config } from "../../tamagui.config";
import { GoogleAuthProvider } from "@/providers/GoogleAuthProvider";
import { authDesign } from "@/theme/tokens";
import { StudySessionProvider } from "../../features/study/session/StudySessionProvider";
import { PushNotificationRuntime } from "../../features/notifications/PushNotificationRuntime";

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <BrandedPageState
    message="Ứng dụng gặp lỗi khi mở màn hình. Vui lòng thử lại."
    onRetry={() => void retry()}
  />;
}

export default function RootLayout() {
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    if (Platform.OS !== "android") return;

    let isExitAlertVisible = false;
    const dismissExitAlert = () => {
      isExitAlertVisible = false;
    };

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      // Let Expo Router handle stacks and the tabs' initialRoute back behavior.
      if (!navigationRef.isReady() || navigationRef.canGoBack()) return false;
      if (isExitAlertVisible) return true;

      isExitAlertVisible = true;
      Alert.alert(
        "Thoát ứng dụng",
        "Bạn có chắc chắn muốn thoát ứng dụng không?",
        [
          { text: "Hủy", style: "cancel", onPress: dismissExitAlert },
          {
            text: "Thoát",
            onPress: () => {
              dismissExitAlert();
              BackHandler.exitApp();
            },
          },
        ],
        { cancelable: true, onDismiss: dismissExitAlert },
      );
      return true;
    });

    return () => subscription.remove();
  }, [navigationRef]);

  return (
    <TamaguiProvider config={config} defaultTheme="light_auth">
      <GoogleAuthProvider>
        <PushNotificationRuntime>
          <SessionProvider>
            <StudySessionProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: authDesign.colors.background },
                }}
              />
            </StudySessionProvider>
          </SessionProvider>
        </PushNotificationRuntime>
      </GoogleAuthProvider>
    </TamaguiProvider>
  );
}
