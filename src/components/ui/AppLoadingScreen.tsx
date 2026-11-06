import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Easing, Image, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Text } from "tamagui";

import { AppButton } from "@/components/ui/AppButton";
import { authDesign, homeDesign } from "@/theme/tokens";

interface AppLoadingScreenProps {
  message: string;
  onRetry?: () => void;
}

export function AppLoadingScreen({ message, onRetry }: AppLoadingScreenProps) {
  const motion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(motion, {
          toValue: 1,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(motion, {
          toValue: 0,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [motion]);

  const owlMotion = {
    transform: [
      { translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) },
      { scale: motion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) },
    ],
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <View style={styles.mascotArea}>
          <View pointerEvents="none" style={styles.halo} />
          <Animated.View style={[styles.owlTile, owlMotion]}>
            <Image
              accessibilityLabel="Cú mascot English Practice"
              source={require("../../../assets/owl-loading.png")}
              resizeMode="contain"
              style={styles.owl}
            />
          </Animated.View>
        </View>

        <Text accessibilityRole="header" style={styles.title}>
          English Practice
        </Text>
        <Text style={styles.subtitle}>Học tiếng Anh vui hơn mỗi ngày</Text>

        <View style={styles.status}>
          <ActivityIndicator
            accessibilityLabel="Đang tải"
            color={authDesign.colors.primary}
            size="small"
          />
          <Text accessibilityLiveRegion="polite" style={styles.message}>
            {message}
          </Text>
        </View>

        {onRetry ? (
          <View style={styles.retry}>
            <AppButton onPress={onRetry}>Thử lại</AppButton>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: homeDesign.colors.background,
  },
  content: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
  },
  mascotArea: {
    width: 208,
    height: 208,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  halo: {
    position: "absolute",
    width: 194,
    height: 194,
    borderRadius: 97,
    borderWidth: 1,
    borderColor: `${authDesign.colors.primary}55`,
  },
  owlTile: {
    width: 150,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 32,
    backgroundColor: "#ffffff",
    shadowColor: authDesign.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 9,
  },
  owl: {
    width: "100%",
    height: "100%",
    borderRadius: 32,
  },
  title: {
    color: homeDesign.colors.text,
    fontSize: 25,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    color: homeDesign.colors.secondary,
    fontSize: 15,
    textAlign: "center",
  },
  status: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 30,
  },
  message: {
    maxWidth: 290,
    color: homeDesign.colors.text,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  retry: {
    width: "100%",
    marginTop: 12,
  },
});
