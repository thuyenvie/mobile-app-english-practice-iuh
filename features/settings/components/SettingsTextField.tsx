import { StyleSheet, Text, TextInput, View } from "react-native";
import type { SettingsTheme } from "@/theme/settingsTheme.types";

interface SettingsTextFieldProps {
  label: string;
  value: string;
  theme: SettingsTheme;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  autoComplete?: "name" | "given-name" | "family-name" | "birthdate-full" | "current-password" | "new-password";
  maxLength?: number;
  placeholder?: string;
  disabled?: boolean;
}

export function SettingsTextField({
  label,
  value,
  theme,
  onChangeText,
  secureTextEntry = false,
  autoComplete,
  maxLength,
  placeholder,
  disabled = false,
}: SettingsTextFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={autoComplete}
        editable={!disabled}
        maxLength={maxLength}
        placeholder={placeholder ?? label}
        placeholderTextColor={theme.muted}
        secureTextEntry={secureTextEntry}
        value={value}
        onChangeText={onChangeText}
        style={[
          styles.input,
          { backgroundColor: theme.background, borderColor: theme.border, color: theme.text, opacity: disabled ? 0.6 : 1 },
        ]}
      />
    </View>
  );
}

export const settingsFormStyles = StyleSheet.create({
  form: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  hint: { fontSize: 13, lineHeight: 18 },
  button: {
    minHeight: 46,
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 15, fontWeight: "700" },
});

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: "600" },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
  },
});
