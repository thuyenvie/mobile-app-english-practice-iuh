import { BrandedPageState } from "@/components/ui/BrandedPageState";
import { useNavigationContainerRef, type ErrorBoundaryProps } from "expo-router";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Alert, BackHandler, Platform } from "react-native";
import { SettingsProvider } from "@/providers/SettingsProvider";
import { SessionProvider } from "@/providers/SessionProvider";

import { GoogleAuthProvider } from "@/providers/GoogleAuthProvider";
import { ThemeProvider, ThemeStack } from "@/theme/ThemeProvider";
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
  // Tai font icon truoc khi ve tab va cac nut, tranh hien o vuong tren web.
  const [fontsLoaded, fontError] = useFonts({
    ...MaterialCommunityIcons.font,
    ...MaterialIcons.font,
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

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

  if (!fontsLoaded) return null;

  return (
      <GoogleAuthProvider>
        <SettingsProvider>
          <ThemeProvider>
          <PushNotificationRuntime>
            <SessionProvider>
              <StudySessionProvider>
                <ThemeStack />
              </StudySessionProvider>
            </SessionProvider>
          </PushNotificationRuntime>
          </ThemeProvider>
        </SettingsProvider>
      </GoogleAuthProvider>
  );
}
