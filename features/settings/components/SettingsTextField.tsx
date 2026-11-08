import { useState, type Ref } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { useFormInputFocus } from "@/components/ui/FormScrollView";
import type { SettingsTheme } from "@/theme/settingsTheme.types";
import { getInteractionColors } from "./interactionColors";

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
  inputRef?: Ref<TextInput>;
  returnKeyType?: TextInputProps["returnKeyType"];
  onSubmitEditing?: TextInputProps["onSubmitEditing"];
  hint?: string;
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
  inputRef,
  returnKeyType = "done",
  onSubmitEditing,
  hint,
}: SettingsTextFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const [focused, setFocused] = useState(false);
  const feedback = getInteractionColors(theme);
  const focusInput = useFormInputFocus();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: focused && !disabled ? theme.selection : theme.text }]}>{label}</Text>
      <View style={styles.inputRow}>
      <TextInput
        ref={inputRef}
        onFocus={() => { setFocused(true); focusInput?.(); }}
        onBlur={() => setFocused(false)}
        returnKeyType={returnKeyType}
        submitBehavior={returnKeyType === "next" ? "submit" : "blurAndSubmit"}
        onSubmitEditing={onSubmitEditing}
        accessibilityLabel={label}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={autoComplete}
        editable={!disabled}
        maxLength={maxLength}
        placeholder={placeholder ?? label}
        placeholderTextColor={theme.muted}
        secureTextEntry={secureTextEntry && !revealed}
        value={value}
        onChangeText={onChangeText}
        style={[
          styles.input,
          { backgroundColor: focused && !disabled ? feedback.selectedBackground : theme.background,
            borderColor: focused && !disabled ? theme.selection : theme.border, color: theme.text, opacity: disabled ? 0.6 : 1 },
        ]}
      />
      {secureTextEntry ? <Pressable accessibilityRole="button"
        accessibilityLabel={`${revealed ? "Ẩn" : "Hiện"} ${label.toLowerCase()}`}
        accessibilityState={{ selected: revealed, disabled }} disabled={disabled}
        onPress={() => setRevealed(value => !value)} style={styles.reveal}>
        <Text style={{ color: theme.accent, fontWeight: "600" }}>{revealed ? "Ẩn" : "Hiện"}</Text>
      </Pressable> : null}
      </View>
      {hint ? <Text style={[settingsFormStyles.hint, { color: theme.muted }]}>{hint}</Text> : null}
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
  hint: { fontSize: 14, lineHeight: 20 },
  button: {
    minHeight: 48,
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
  inputRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  reveal: { minHeight: 48, minWidth: 48, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
  },
});
