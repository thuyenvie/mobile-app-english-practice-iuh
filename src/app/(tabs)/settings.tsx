import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Text, YStack } from "tamagui";

import { AppButton } from "@/components/ui/AppButton";
import { HomeScaffold } from "../../../features/home/components/HomeScaffold";
import { getSessionSnapshot, enterGuestSession } from "@/lib/auth/sessionStore";
import { removeTokens } from "@/lib/auth/tokenStorage";
import { useSession } from "@/lib/auth/useSession";
import { homeDesign } from "@/theme/tokens";
import { deactivateCurrentPushToken } from "../../../features/notifications/api/pushNotificationApi";

export default function SettingsScreen() {
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const switchToGuest = () => {
    Alert.alert(
      "Chuyển sang học thử",
      "Phiên đăng nhập sẽ bị xóa khỏi thiết bị. Bài học thử tiếp theo không được lưu vào lịch sử.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Chuyển sang học thử",
          onPress: () => void confirmSwitchToGuest(),
        },
      ],
    );
  };

  const confirmSwitchToGuest = async () => {
    setBusy(true);
    setError("");
    try {
      const generation = getSessionSnapshot().generation;
      let pushTokenDeactivated = true;
      try {
        await deactivateCurrentPushToken();
      } catch {
        // Van dang xuat local du offline; dang nhap tai khoan khac se gan lai token.
        pushTokenDeactivated = false;
      }
      await removeTokens({ generation, onSaved: enterGuestSession });
      if (!pushTokenDeactivated) {
        Alert.alert(
          "Đã chuyển sang học thử",
          "Thiết bị chưa kết nối được máy chủ để hủy token thông báo. Khi có mạng, hãy đăng nhập lại để đồng bộ thiết bị.",
        );
      }
      router.replace("/(tabs)/home");
    } catch {
      setError("Không thể xóa phiên đăng nhập. Hãy thử lại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <HomeScaffold>
      <YStack flex={1} padding={24} gap={16} backgroundColor={homeDesign.colors.background}>
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
            <AppButton disabled={busy} onPress={switchToGuest}>
              {busy ? "Đang chuyển..." : "Chuyển sang học thử"}
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
      </YStack>
    </HomeScaffold>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10 },
});
