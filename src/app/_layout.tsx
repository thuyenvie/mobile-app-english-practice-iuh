import { Stack, router, useNavigationContainerRef } from "expo-router";
import { useEffect } from "react";
import { Alert, BackHandler, Platform } from "react-native";
import { subscribeToSessionExpiration } from "@/lib/auth/sessionEvents";
import { TamaguiProvider } from "tamagui";

import { config } from "../../tamagui.config";
import { GoogleAuthProvider } from "@/providers/GoogleAuthProvider";
import { authDesign } from "@/theme/tokens";

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

  useEffect(() => {
    const subscription = subscribeToSessionExpiration(() =>
      router.replace("/auth/login")
    );
    return () => subscription.remove();
  }, []);

  return (
    <TamaguiProvider config={config} defaultTheme="light_auth">
      <GoogleAuthProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: authDesign.colors.background },
          }}
        />
      </GoogleAuthProvider>
    </TamaguiProvider>
  );
}
