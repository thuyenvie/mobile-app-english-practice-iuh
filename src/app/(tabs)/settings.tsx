import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Text, YStack } from "tamagui";

import { AppButton } from "@/components/ui/AppButton";
import { HomeScaffold } from "../../../features/home/components/HomeScaffold";
import { getSessionSnapshot, enterGuestSession } from "@/lib/auth/sessionStore";
import { getAccessToken, removeTokens } from "@/lib/auth/tokenStorage";
import { useSession } from "@/lib/auth/useSession";
import { homeDesign } from "@/theme/tokens";
import { logout } from "../../../features/auth/api/authApi";
import { RecentStudyTimeCard } from "../../../features/home/components/RecentStudyTimeCard";

export default function SettingsScreen() {
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const confirmLogout = () => {
    Alert.alert(
      "Đăng xuất",
      "Bạn sẽ đăng xuất khỏi tài khoản trên thiết bị này. Sau đó bạn vẫn có thể học thử, nhưng kết quả sẽ không được lưu vào tài khoản.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đăng xuất",
          style: "destructive",
          onPress: () => void handleLogout(),
        },
      ],
    );
  };

  const handleLogout = async () => {
    setBusy(true);
    setError("");
    try {
      const generation = getSessionSnapshot().generation;
      const token = await getAccessToken();
      let serverRevocationFailed = false;

      if (token) {
        try {
          await logout(token);
        } catch {
          // Local sign-out must still work when the API is offline.
          serverRevocationFailed = true;
        }
      }

      await removeTokens({ generation, onSaved: enterGuestSession });
      router.replace("/(tabs)/home");
      if (serverRevocationFailed) {
        Alert.alert(
          "Đã đăng xuất trên thiết bị",
          "Không thể xác nhận thu hồi phiên trên máy chủ. Token đăng nhập đã được xóa khỏi thiết bị.",
        );
      }
    } catch {
      setError("Không thể đăng xuất. Hãy thử lại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <HomeScaffold>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text color={homeDesign.colors.text} fontSize={26} fontWeight="800">
          Cài đặt
        </Text>

        {session.status === "loading" ? (
          <View style={styles.statusRow}>
            <ActivityIndicator color={homeDesign.colors.link} />
            <Text color={homeDesign.colors.secondary}>Đang khôi phục phiên...</Text>
          </View>
        ) : session.status === "authenticated" ? (
          <YStack gap={12}>
            <Text color={homeDesign.colors.secondary}>
              Đang đăng nhập: {session.subject ?? "tài khoản"}
            </Text>
            {error ? <Text color={homeDesign.colors.inProgress}>{error}</Text> : null}
            <AppButton disabled={busy} onPress={confirmLogout}>
              {busy ? "Đang đăng xuất..." : "Đăng xuất"}
            </AppButton>
          </YStack>
        ) : (
          <YStack gap={12}>
            <Text color={homeDesign.colors.secondary}>
              Bạn đang ở chế độ học thử. Kết quả bài làm không được lưu vào tài khoản.
            </Text>
            <Pressable onPress={() => router.push("/auth/login")} accessibilityRole="button">
              <Text color={homeDesign.colors.link}>Đăng nhập để lưu kết quả</Text>
            </Pressable>
          </YStack>
        )}
        <RecentStudyTimeCard authenticated={session.status === "authenticated"} />
      </ScrollView>
    </HomeScaffold>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: 24, paddingBottom: 32, gap: 18, backgroundColor: homeDesign.colors.background },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10 },
});
