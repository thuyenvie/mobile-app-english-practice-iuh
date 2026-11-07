import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo, useMemo } from "react";

import { Text, type TextStyle } from "react-native";



function cleanWord(token: string) {
  return token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

export function InteractiveText({
  text,
  onWordPress,
  selectedWord,
  textStyle,
}: {
  text: string;
  onWordPress: (word: string, context: string) => void;
  selectedWord?: string | null;
  textStyle?: TextStyle;
}) {
  const { selectedWordStyle } = useThemedStyles();
  const tokens = useMemo(() => text.match(/\s+|[^\s]+/g) ?? [], [text]);

  return (
    <Text style={textStyle}>
      {tokens.map((token, index) => {
        const word = cleanWord(token);
        if (!word) return token;

        const selected = word.toLocaleLowerCase() === selectedWord?.toLocaleLowerCase();
        return (
          <Text
            key={`${index}-${token}`}
            onPress={() => onWordPress(word, text)}
            style={selected ? selectedWordStyle : undefined}
            accessibilityRole="button"
            accessibilityLabel={`Tra từ ${word}`}
          >
            {token}
          </Text>
        );
      })}
    </Text>
  );
}

function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { themeColor } = appTheme;
    const selectedWordStyle: TextStyle = {
      backgroundColor: themeColor("#fff0b3", "background"),
      color: themeColor("#26200c", "text"),
    };
    return { themeColor, selectedWordStyle };
  }, [appTheme]);
}
