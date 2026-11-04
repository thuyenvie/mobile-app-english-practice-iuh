import { Fragment, useEffect, type PropsWithChildren } from "react";
import { ActivityIndicator, View } from "react-native";
import { Text } from "tamagui";
import { AppButton } from "@/components/ui/AppButton";
import { useSession } from "@/lib/auth/useSession";
import { restoreSession } from "@/lib/auth/restoreSession";
import { homeDesign } from "@/theme/tokens";

export function SessionProvider({ children }: PropsWithChildren) {
  const session = useSession();
  useEffect(() => { void restoreSession(); }, []);
  if (session.status === "loading") {
    return <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 16, backgroundColor: homeDesign.colors.background }}>
      <ActivityIndicator />
      <Text color={homeDesign.colors.text}>{session.error || "Đang kiểm tra phiên..."}</Text>
      {session.error ? <AppButton onPress={() => void restoreSession()}>Thử lại</AppButton> : null}
    </View>;
  }
  // All account-bound screen state is discarded together when identity changes.
  return <Fragment key={session.generation}>{children}</Fragment>;
}
