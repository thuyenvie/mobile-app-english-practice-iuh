import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Use inside an existing Modal overlay; retain its close and busy policy. */
export function DialogContent({ children, style, contentStyle }: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}>) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <View accessibilityViewIsModal style={[styles.card, style, {
      maxHeight: Math.max(1, height - insets.top - insets.bottom - 48),
      marginTop: insets.top, marginBottom: insets.bottom,
    }]}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={contentStyle}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ card: { width: "100%", flexShrink: 1, overflow: "hidden" } });
