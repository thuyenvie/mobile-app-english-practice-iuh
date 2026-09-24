import { Button, type ButtonProps } from 'tamagui';

import { typography } from '@/theme/tokens';

type AppButtonProps = ButtonProps & { appearance?: 'primary' | 'text' };

export function AppButton({ appearance = 'primary', ...props }: AppButtonProps) {
  if (appearance === 'text') {
    return (
      <Button unstyled backgroundColor="transparent" borderWidth={0} padding={0}
        minHeight="$touchTarget" justifyContent="center" color="$color"
        accessibilityRole="button" {...props} />
    );
  }

  return (
    <Button minHeight="$control" height="auto" paddingVertical="$medium"
      borderRadius="$control" backgroundColor="$primary" color="$onPrimary"
      {...typography.button} borderWidth={0} accessibilityRole="button"
      pressStyle={{ backgroundColor: '$primaryPressed' }} {...props} />
  );
}
