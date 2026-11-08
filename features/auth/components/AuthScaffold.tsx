import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo, type PropsWithChildren } from "react";

import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Text, Theme } from "tamagui";

import { AuthHeader } from "./AuthHeader";

type AuthScaffoldProps = PropsWithChildren<{ title: string; subtitle: string }>;

export function AuthScaffold({ children, title, subtitle }: AuthScaffoldProps) {
  const { tamaguiTheme, statusBarStyle, themeColor, styles } = useThemedStyles();
  const insets = useSafeAreaInsets();

  return (
    <Theme name={tamaguiTheme}>
      <StatusBar style={statusBarStyle} />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.halo, { pointerEvents: "none" }]} />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20,
              paddingLeft: insets.left + 18, paddingRight: insets.right + 18 },
          ]}
        >
          <View style={styles.column}>
            <AuthHeader />
            <View style={styles.card}>
              <Text role="heading" color={themeColor("#0C316A", "text")} fontSize={24} fontWeight="700">{title}</Text>
              <Text color={themeColor("#425A7C", "text")} fontSize={14} marginTop={5} marginBottom={16}>{subtitle}</Text>
              {children}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Theme>
  );
}



function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { tamaguiTheme, statusBarStyle, themeColor, palette } = appTheme;
    const styles = StyleSheet.create({
      container: { flex: 1, backgroundColor: palette.background },
      halo: { position: "absolute", left: -105, top: -130, width: 300, height: 300, borderRadius: 150, backgroundColor: themeColor("#D2E7FF", "background") },
      content: { flexGrow: 1, justifyContent: "center" },
      column: { width: "100%", maxWidth: 420, alignSelf: "center" },
      card: { backgroundColor: themeColor("#FFFFFF", "background"), borderColor: themeColor("#D1E4FF", "border"), borderWidth: 1, borderRadius: 20, padding: 16 },
    });
    return { tamaguiTheme, statusBarStyle, themeColor, palette, styles };
  }, [appTheme]);
}
