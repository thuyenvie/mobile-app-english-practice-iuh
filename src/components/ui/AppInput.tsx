import { Input, Text, YStack, type InputProps, type TextProps, type YStackProps } from 'tamagui';

import { typography } from '@/theme/tokens';

type AppInputProps = InputProps & {
  label: string;
  labelProps?: TextProps;
  labelGap?: YStackProps['gap'];
};

export function AppInput({ label, labelProps, labelGap = '$small', ...props }: AppInputProps) {
  return (
    <YStack gap={labelGap}>
      <Text color="$color" {...typography.label} {...labelProps}>{label}</Text>
      <Input minHeight="$control" borderRadius="$control" backgroundColor="$inputBackground"
        borderColor="$borderColor" color="$color" placeholderTextColor="$placeholderColor"
        fontSize={typography.body.fontSize} paddingHorizontal="$medium"
        accessibilityLabel={label} focusStyle={{ borderColor: '$primary' }} {...props} />
    </YStack>
  );
}
