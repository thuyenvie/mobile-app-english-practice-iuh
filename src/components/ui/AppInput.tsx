import {
  Input,
  Text,
  YStack,
  type InputProps,
  type TextProps,
  type YStackProps,
} from "tamagui";

import { authDesign, typography } from "@/theme/tokens";

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
  return (
    <YStack gap={labelGap}>
      <Text color={authDesign.colors.text} {...typography.label} {...labelProps}>
        {label}
      </Text>
      <Input
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
