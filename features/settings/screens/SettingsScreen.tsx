import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo, useState } from "react";
import { RequireAccount } from "@/components/auth/RequireAccount";
import { useSettings } from "@/providers/SettingsProvider";

import { SettingsSection } from "../components/SettingsSection";
import { SET01Entry } from "../entries/SET01Entry";
import { SET02Entry } from "../entries/SET02Entry";
import { SET03Entry } from "../entries/SET03Entry";
import { SET04Entry } from "../entries/SET04Entry";
import { SET05Entry } from "../entries/SET05Entry";
import { SET06Entry } from "../entries/SET06Entry";
import { SET07Entry } from "../entries/SET07Entry";
import { SET08Entry } from "../entries/SET08Entry";

import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Text, YStack } from "tamagui";

import { AppButton } from "@/components/ui/AppButton";
import { HomeScaffold } from "../../home/components/HomeScaffold";
import { assertSessionGeneration, getSessionSnapshot, enterGuestSession } from "@/lib/auth/sessionStore";
import { getAccessToken, removeTokens } from "@/lib/auth/tokenStorage";
import { useSession } from "@/lib/auth/useSession";

import { deactivateCurrentPushToken } from "../../notifications/api/pushNotificationApi";
import { logout } from "../../auth/api/authApi";
import { useStudySession } from "../../study/session/StudySessionProvider";
import { RecentStudyTimeCard } from "../../home/components/RecentStudyTimeCard";

export default function SettingsScreen() {
  const { settingsTheme, homeDesign, styles } = useThemedStyles();
  const session = useSession();
  const settings = useSettings();
  const entryProps = { settings, authenticated: session.status === "authenticated", theme: settingsTheme };
  const { pause } = useStudySession();
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
      let studySessionPaused = true;
      try { await pause(); } catch { studySessionPaused = false; }
      let pushTokenDeactivated = true;
      try {
        // Huy push truoc khi thu hoi JWT de request van duoc xac thuc.
        await deactivateCurrentPushToken();
      } catch {
        // Van dang xuat local du offline; dang nhap tai khoan khac se gan lai token.
        pushTokenDeactivated = false;
      }
      const token = await getAccessToken();
      assertSessionGeneration(generation);
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
      if (!studySessionPaused || !pushTokenDeactivated || serverRevocationFailed) {
        const warnings: string[] = [];
        if (!studySessionPaused) warnings.push("Phiên học chưa được đồng bộ tạm dừng.");
        if (!pushTokenDeactivated) {
          warnings.push("Chưa thể hủy đăng ký thông báo trên máy chủ.");
        }
        if (serverRevocationFailed) {
          warnings.push("Chưa thể xác nhận thu hồi phiên trên máy chủ.");
        }
        Alert.alert(
          "Đã đăng xuất trên thiết bị",
          `${warnings.join(" ")} Token đăng nhập đã được xóa khỏi thiết bị.`,
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
        {settings.hydration !== "ready" ? <View style={styles.statusRow}>
          <Text style={{ color: settingsTheme.muted }} flex={1}>
            {settings.hydrationError?.message ?? "Đang đọc cài đặt đã lưu..."}
          </Text>
          {settings.hydration === "error" ? <AppButton appearance="text" onPress={() => { void settings.retryHydration().catch(() => {}); }}>Thử lại</AppButton> : null}
        </View> : null}
        {settings.recoveredFields.length ? <Text style={{ color: settingsTheme.warning }}>Một số lựa chọn đã lưu không hợp lệ; đang dùng giá trị mặc định cho các mục đó.</Text> : null}
        {settings.persistenceError ? <Text style={{ color: settingsTheme.error }}>{settings.persistenceError.message}</Text> : null}
        <SettingsSection title="Giao diện và học tập">
          <SET01Entry {...entryProps} />
          <SET02Entry {...entryProps} />
          <SET03Entry {...entryProps} />
        </SettingsSection>
        <SettingsSection title="Tài khoản">
          <RequireAccount title="Cài đặt tài khoản">
            <SET04Entry {...entryProps} />
            <SET05Entry {...entryProps} />
          </RequireAccount>
        </SettingsSection>
        <SettingsSection title="Dữ liệu và hỗ trợ">
          <SET06Entry {...entryProps} />
          <RequireAccount title="Gửi phản hồi / Báo lỗi">
            <SET08Entry {...entryProps} />
          </RequireAccount>
        </SettingsSection>
        <SettingsSection title="Giới thiệu">
          <SET07Entry {...entryProps} />
        </SettingsSection>
        <RecentStudyTimeCard authenticated={session.status === "authenticated"} />
      </ScrollView>
    </HomeScaffold>
  );
}

function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { settingsTheme, homeDesign } = appTheme;
    const styles = StyleSheet.create({
      content: { flexGrow: 1, padding: 24, paddingBottom: 32, gap: 18, backgroundColor: homeDesign.colors.background },
      statusRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    });
    return { settingsTheme, homeDesign, styles };
  }, [appTheme]);
}
