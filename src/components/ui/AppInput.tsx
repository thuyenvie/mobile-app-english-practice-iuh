import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo } from "react";
import {
  Input,
  Text,
  YStack,
  type InputProps,
  type TextProps,
  type YStackProps,
} from "tamagui";

import { typography } from "@/theme/tokens";

type AppInputProps = InputProps & {
  label: string;
  labelProps?: TextProps;
  labelGap?: YStackProps["gap"];
};

export function AppInput({
  label,
  labelProps,
  labelGap = "$small",
  ...props
}: AppInputProps) {
  const { resolvedMode } = useAppTheme();
  const { authDesign } = useThemedStyles();
  return (
    <YStack gap={labelGap}>
      <Text color={authDesign.colors.text} {...typography.label} {...labelProps}>
        {label}
      </Text>
      <Input keyboardAppearance={resolvedMode}
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
        {...props}
      />
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
