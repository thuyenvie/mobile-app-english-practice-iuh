import * as Font from "expo-font";
import { useEffect, useState } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";

const FONT_NAME = "NotoSansIPA";
const FONT_ASSET = require("../../../assets/fonts/NotoSansIPA.ttf");
let fontLoading: Promise<void> | null = null;

function loadIpaFont() {
  if (Font.isLoaded(FONT_NAME)) return Promise.resolve();
  if (!fontLoading) fontLoading = Font.loadAsync(FONT_NAME, FONT_ASSET);
  return fontLoading;
}

// Font Noto Sans ho tro ky hieu IPA tren ca iOS va Android.
export function PhoneticText({
  children,
  style,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
}) {
  const [fontLoaded, setFontLoaded] = useState(() => Font.isLoaded(FONT_NAME));

  useEffect(() => {
    let mounted = true;
    void loadIpaFont()
      .then(() => {
        if (mounted) setFontLoaded(true);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  return <Text style={[style, fontLoaded ? { fontFamily: FONT_NAME } : undefined]}>{children}</Text>;
}
