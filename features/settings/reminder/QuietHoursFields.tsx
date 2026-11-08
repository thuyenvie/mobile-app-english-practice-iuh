import { useRef, type Ref } from "react";
import { Text, TextInput, View } from "react-native";
import type { SettingsTheme } from "@/theme/settingsTheme.types";
import { SettingsTextField } from "../components/SettingsTextField";

export function QuietHoursFields({ start, end, onStartChange, onEndChange, theme, disabled = false, startInputRef }: {
  start: string;
  end: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  theme: SettingsTheme;
  disabled?: boolean;
  startInputRef?: Ref<TextInput>;
}) {
  const endInput = useRef<TextInput>(null);
  return <View style={{ gap: 10 }}>
    <SettingsTextField label="Yên lặng từ" value={start} onChangeText={onStartChange}
      theme={theme} disabled={disabled} placeholder="HH:mm, ví dụ 22:00" maxLength={5}
      inputRef={startInputRef} returnKeyType="next" onSubmitEditing={() => endInput.current?.focus()} />
    <SettingsTextField label="Yên lặng đến" value={end} onChangeText={onEndChange}
      theme={theme} disabled={disabled} placeholder="HH:mm, ví dụ 07:00" maxLength={5}
      inputRef={endInput} returnKeyType="done" />
    <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 19 }}>
      Giờ 24h (HH:mm). 22:00–07:00 là qua nửa đêm. Để trống cả hai giờ hoặc đặt hai giờ giống nhau để tắt yên lặng.
    </Text>
  </View>;
}
