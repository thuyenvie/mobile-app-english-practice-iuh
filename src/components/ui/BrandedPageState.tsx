import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo, useEffect, useState } from "react";
import { Animated, Easing, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

type Props = {
  message: string;
  loading?: boolean;
  compact?: boolean;
  overlay?: boolean;
  onRetry?: () => void;
  onBack?: () => void;
};

const logo = require("../../../assets/english-practice-logo.jpg");


function LoadingDots({ light }: { light?: boolean }) {
  const { styles } = useThemedStyles();
  const [phase] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.loop(Animated.timing(phase, {
      toValue: 3, duration: 1050, easing: Easing.linear, useNativeDriver: Platform.OS !== "web",
    }));
    animation.start();
    return () => animation.stop();
  }, [phase]);

  return <View style={styles.dots} accessibilityRole="progressbar" accessibilityLabel="Đang tải">
    {[0, 1, 2].map(index => <Animated.View key={index} style={[styles.dot, light && styles.lightDot, {
      opacity: phase.interpolate({
        inputRange: [index, index + 0.5, index + 1],
        outputRange: [0.35, 1, 0.35],
        extrapolate: "clamp",
      }),
    }]} />)}
  </View>;
}

export function BrandedPageState({ message, loading, compact, overlay, onRetry, onBack }: Props) {
  const { themeColor, blue, styles } = useThemedStyles();
  const small = compact || overlay;
  const content = <>
    <Image source={logo} accessibilityLabel="Practice Easy English" style={[styles.logo, small && styles.smallLogo]} />
    {!small && <>
      <Text style={styles.tagline}>Learn English. Practice More.{"\n"}Speak Better!</Text>
      <View style={styles.illustration} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <MaterialCommunityIcons name="book-open-page-variant-outline" size={36} color={themeColor("#78AFFF", "text")} />
        <MaterialCommunityIcons name="headphones" size={86} color={blue} />
        <MaterialCommunityIcons name="message-text-outline" size={36} color={themeColor("#78AFFF", "text")} />
      </View>
    </>}
    {loading ? <LoadingDots light={overlay} /> : <Text style={[styles.heading, overlay && styles.lightHeading]}>Chưa thể tải trang</Text>}
    <Text accessibilityLiveRegion="polite" style={[styles.message, overlay && styles.lightMessage]}>{message}</Text>
    {((onRetry && !loading) || onBack) ? <View style={overlay && styles.actions}>
      {onRetry && !loading ? <Pressable accessibilityRole="button" onPress={onRetry} style={[styles.button, overlay && styles.overlayButton]}>
        <Text style={styles.buttonText}>Thử lại</Text>
      </Pressable> : null}
      {onBack ? <Pressable accessibilityRole="button" onPress={onBack} style={[styles.back, overlay && styles.overlayButton]}>
        <Text style={[styles.heading, overlay && styles.lightHeading]}>{overlay ? "Đóng" : "Quay lại"}</Text>
      </Pressable> : null}
    </View> : null}
    {!small && <Text style={styles.footer}>Your English Learning Journey Starts Here!</Text>}
  </>;

  if (overlay) return <View style={styles.overlay}>
    <View style={[styles.content, styles.dialog]}>{content}</View>
  </View>;
  if (compact) return <View style={[styles.content, styles.card]}>{content}</View>;
  return <ScrollView style={styles.screen} contentContainerStyle={[styles.content, styles.page]}>{content}</ScrollView>;
}



function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { themeColor, palette } = appTheme;
    const blue = themeColor("#084CB0", "text");
    const styles = StyleSheet.create({
      overlay: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: themeColor("rgba(0, 0, 0, 0.24)", "background"), justifyContent: "center", alignItems: "center", padding: 24, zIndex: 10 },
      dialog: { width: "100%", maxWidth: 296, padding: 18, gap: 10, backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1, borderRadius: 22 },
      lightHeading: { color: palette.text },
      lightMessage: { color: palette.muted },
      lightDot: { backgroundColor: palette.accent },
      actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
      overlayButton: { minHeight: 44, paddingHorizontal: 18, paddingVertical: 8, justifyContent: "center" },
      dots: { flexDirection: "row", alignItems: "center", gap: 8, height: 24 },
      dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: blue },
      screen: { flex: 1, backgroundColor: palette.background },
      content: { alignItems: "center", justifyContent: "center", gap: 14, padding: 24 },
      page: { flexGrow: 1, paddingVertical: 48 },
      card: { backgroundColor: themeColor("#EAF4FF", "background"), borderRadius: 20, margin: 12 },
      logo: { width: 152, height: 152, borderRadius: 76 },
      smallLogo: { width: 68, height: 68, borderRadius: 34 },
      tagline: { color: blue, fontSize: 22, fontWeight: "800", fontStyle: "italic", textAlign: "center" },
      illustration: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14, backgroundColor: themeColor("#D7E9FF", "background"), borderRadius: 52, padding: 14 },
      heading: { color: blue, fontSize: 17, fontWeight: "700", textAlign: "center" },
      message: { color: themeColor("#254A74", "text"), textAlign: "center", maxWidth: 440, lineHeight: 22 },
      footer: { color: themeColor("#38669A", "text"), textAlign: "center", marginTop: 12 },
      button: { backgroundColor: blue, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 24 },
      buttonText: { color: themeColor("#FFF", "onAccent"), fontWeight: "700" },
      back: { padding: 8 },
    });
    return { themeColor, palette, blue, styles };
  }, [appTheme]);
}
