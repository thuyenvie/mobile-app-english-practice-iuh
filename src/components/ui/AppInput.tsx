import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo, useState, type Ref } from "react";
import { useFormInputFocus } from "./FormScrollView";
import { AppButton } from "./AppButton";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "react-native";
import {
  Input,
  Text,
  YStack,
  XStack,
  type InputProps,
  type InputRef,
  type TextProps,
  type YStackProps,
} from "tamagui";

import { typography } from "@/theme/tokens";

type AppInputProps = InputProps & {
  label: string;
  labelProps?: TextProps;
  labelGap?: YStackProps["gap"];
  inputRef?: Ref<InputRef>;
};

export function AppInput({
  label,
  labelProps,
  labelGap = "$small",
  secureTextEntry,
  onFocus,
  inputRef,
  ...props
}: AppInputProps) {
  const focusInput = useFormInputFocus();
  const [revealed, setRevealed] = useState(false);
  const { resolvedMode } = useAppTheme();
  const { authDesign } = useThemedStyles();
  return (
    <YStack gap={labelGap}>
      <Text color={authDesign.colors.text} {...typography.label} {...labelProps}>
        {label}
      </Text>
      <XStack alignItems="center" flex={1} minWidth={0} position="relative">
        <Input keyboardAppearance={resolvedMode}
          ref={inputRef}
          flex={1}
          minWidth={0}
          minHeight="$control"
          borderRadius="$control"
          backgroundColor={authDesign.colors.surface}
          borderColor={authDesign.colors.border}
          color={authDesign.colors.text}
          placeholderTextColor={authDesign.colors.placeholder as import("tamagui").ColorTokens}
          fontSize={typography.body.fontSize}
          paddingHorizontal="$medium"
          aria-label={label}
          focusStyle={{ borderColor: authDesign.colors.primary }}
          secureTextEntry={secureTextEntry && !revealed}
          onFocus={event => { focusInput?.(); onFocus?.(event); }}
          {...props}
          paddingRight={secureTextEntry ? 52 : undefined}
        />
        {secureTextEntry ? <AppButton appearance="text" position="absolute" right={4} top={0} bottom={0}
          zIndex={1} minWidth={44} width={44} minHeight={48} paddingHorizontal={4}
          aria-label={`${revealed ? "Ẩn" : "Hiện"} ${label.toLowerCase()}`}
          accessibilityState={{ selected: revealed }}
          onPress={() => setRevealed(value => !value)} color={authDesign.colors.primary}>
          {!revealed ? (
            <Image
              source={require("../../../assets/password-eye.png")}
              accessibilityIgnoresInvertColors
              style={{ width: 22, height: 22 }}
              resizeMode="contain"
            />
          ) : (
            <MaterialCommunityIcons name="eye-off" size={22} color={authDesign.colors.primary} />
          )}
        </AppButton> : null}
      </XStack>
    </YStack>
  );
}

function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { authDesign } = appTheme;

    return { authDesign };
  }, [appTheme]);
}
