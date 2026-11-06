import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";



export function VocabularyPronunciationButton({
  audioUrl,
  word,
  activeUrl,
  playing,
  loading,
  error,
  onPress,
  compact = false,
  activeWord = "",
}: {
  audioUrl?: string | null;
  word: string;
  activeUrl: string | null;
  playing: boolean;
  loading: boolean;
  error: string;
  onPress: (audioUrl: string | null | undefined, word: string) => void;
  compact?: boolean;
  activeWord?: string;
}) {
  const { homeDesign, styles } = useThemedStyles();
  const isActive = audioUrl ? activeUrl === audioUrl : activeWord === word;
  const isPlaying = isActive && playing;
  const isLoading = isActive && loading && !error;
  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <Pressable
        onPress={(event: GestureResponderEvent) => {
          event.stopPropagation();
          onPress(audioUrl, word);
        }}
        disabled={isLoading && !playing}
        accessibilityRole="button"
        accessibilityLabel={`Nghe phát âm từ ${word}`}
        accessibilityState={{ disabled: isLoading && !playing, busy: isLoading }}
        style={[styles.button, compact && styles.compactButton, isLoading && styles.disabled]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={homeDesign.colors.link} />
        ) : (
          <MaterialCommunityIcons
            name={isPlaying ? "volume-high" : "volume-medium"}
            size={21}
            color={isPlaying || audioUrl ? homeDesign.colors.link : homeDesign.colors.secondary}
          />
        )}
      </Pressable>
      {error && isActive ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}



function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { homeDesign, themeColor } = appTheme;
    const styles = StyleSheet.create({
      container: { alignItems: "center", gap: 2 },
      compactContainer: { flexDirection: "row", alignItems: "center" },
      button: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 19, backgroundColor: homeDesign.colors.surfaceRaised },
      compactButton: { width: 34, height: 34 },
      disabled: { opacity: 0.65 },
      error: { maxWidth: 180, color: themeColor("#ff9d9d", "text"), fontSize: 10, textAlign: "center" },
    });
    return { homeDesign, themeColor, styles };
  }, [appTheme]);
}
