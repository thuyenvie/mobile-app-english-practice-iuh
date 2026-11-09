import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo } from "react";
import Constants from "expo-constants";
import { router } from "expo-router";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { HomeScaffold } from "../../home/components/HomeScaffold";
import { getAboutMetadata } from "../metadata/aboutMetadata";

export default function AboutScreen() {
  const { styles } = useThemedStyles();
  const metadata = getAboutMetadata(Constants.expoConfig);
  const back = () => router.canGoBack() ? router.back() : router.replace("/(tabs)/settings");
  return <HomeScaffold>
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" accessibilityLabel="Quay lại cài đặt" onPress={back} style={styles.back}>
        <Text style={styles.link}>‹ Quay lại</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.heading}>Giới thiệu ứng dụng</Text>
      <View style={styles.card}>
        <Text selectable style={styles.name}>{metadata.name}</Text>
        <Text selectable style={styles.text}>Phiên bản ứng dụng: {metadata.version}</Text>
        <Text style={styles.note}>Thông tin từ cấu hình ứng dụng đang chạy. Đây không phải số bản dựng native hoặc mã bản cập nhật OTA.</Text>
      </View>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.name}>Thông tin liên hệ</Text>
        <Text style={styles.text}>Nhóm phát triển English Practice</Text>
        <View style={styles.member}>
          <Text style={styles.memberId}>23633961</Text>
          <Text style={styles.memberName}>Nguyễn Công Tuyến (NCT)</Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Mở Facebook của Nguyễn Công Tuyến"
            onPress={() => void Linking.openURL("https://www.facebook.com/cong.tuyen.307425").catch(() =>
              Alert.alert("Không mở được liên kết", "Vui lòng thử lại sau."))}
            hitSlop={8}
          >
            <Text style={styles.link}>Facebook cá nhân ↗</Text>
          </Pressable>
        </View>
        <View style={styles.divider} />
        <View style={styles.member}>
          <Text style={styles.memberId}>23636821</Text>
          <Text style={styles.memberName}>Đỗ Hoài Nhớ</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.member}>
          <Text style={styles.memberId}>23635991</Text>
          <Text style={styles.memberName}>Tô Nguyễn An Thuyên</Text>
        </View>
      </View>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.name}>Ghi nhận nguồn</Text>
        <Text style={styles.text}>Phông chữ Noto Sans — Copyright 2022 The Noto Project Authors. SIL Open Font License, Version 1.1.</Text>
        <Text style={styles.note}>Bản giấy phép phông chữ được lưu cùng ứng dụng tại assets/fonts/NotoSans-OFL.txt.</Text>
        <Text style={styles.note}>Mã nền Expo có thông báo MIT của 650 Industries, Inc. trong LICENSE. Thông báo này chỉ nói về mã nền, không xác nhận giấy phép cho toàn bộ nội dung ứng dụng.</Text>
      </View>
    </ScrollView>
  </HomeScaffold>;
}

function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { settingsTheme: theme } = appTheme;
    const styles = StyleSheet.create({
      content: { flexGrow: 1, padding: 24, gap: 20, backgroundColor: theme.background },
      back: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
      link: { color: theme.accent, fontSize: 16 },
      heading: { color: theme.text, fontSize: 26, fontWeight: "800" },
      card: { padding: 16, gap: 12, borderWidth: 1, borderColor: theme.border, borderRadius: 12, backgroundColor: theme.surface },
      name: { color: theme.text, fontSize: 18, fontWeight: "600" },
      text: { color: theme.text, fontSize: 16, lineHeight: 24 },
      member: { gap: 3, paddingVertical: 4 },
      memberId: { color: theme.muted, fontSize: 14, fontWeight: "600", letterSpacing: 0.3 },
      memberName: { color: theme.text, fontSize: 16, fontWeight: "600", lineHeight: 23 },
      divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.border },
      note: { color: theme.muted, fontSize: 14, lineHeight: 22 },
    });
    return { theme, styles };
  }, [appTheme]);
}
