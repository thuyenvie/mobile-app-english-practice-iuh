import { Stack, router } from "expo-router";
import { useEffect } from "react";
import { subscribeToSessionExpiration } from "@/lib/auth/sessionEvents";
import { TamaguiProvider } from "tamagui";

import { config } from "../../tamagui.config";
import { GoogleAuthProvider } from "@/providers/GoogleAuthProvider";
import { authDesign } from "@/theme/tokens";

export default function RootLayout() {
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
