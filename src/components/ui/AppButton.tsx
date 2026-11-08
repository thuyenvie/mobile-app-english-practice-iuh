import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo } from "react";
import { Button, type ButtonProps } from "tamagui";
import { Platform } from "react-native";

import { typography } from "@/theme/tokens";

type AppButtonProps = ButtonProps & { appearance?: "primary" | "text" };

export function AppButton({
  appearance = "primary",
  accessibilityState,
  accessibilityLabel,
  ...props
}: AppButtonProps) {
  const { authDesign } = useThemedStyles();
  // Web dung ARIA; khong dua accessibilityState vao the button cua DOM.
  const accessibilityProps = Platform.OS === "web"
      ? {
          "aria-label": accessibilityLabel,
          "aria-disabled": accessibilityState?.disabled,
          "aria-pressed": accessibilityState?.selected,
          "aria-checked": accessibilityState?.checked,
          "aria-busy": accessibilityState?.busy,
          "aria-expanded": accessibilityState?.expanded,
        }
      : { accessibilityState, accessibilityLabel };

  if (appearance === "text") {
    return (
      <Button
        unstyled
        backgroundColor="transparent"
        borderWidth={0}
        padding={0}
        minHeight={48}
        height="auto"
        justifyContent="center"
        color="$color"
        role="button"
        {...accessibilityProps}
        {...props}
      />
    );
  }

  return (
    <Button
      minHeight={52}
      height="auto"
      paddingVertical="$medium"
      borderRadius="$control"
      backgroundColor={authDesign.colors.primary}
      color={authDesign.colors.onAccent}
      {...typography.button}
      borderWidth={0}
      role="button"
      pressStyle={{ backgroundColor: authDesign.colors.primaryPressed }}
      {...accessibilityProps}
      {...props}
    />
  );
}

function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { authDesign } = appTheme;

    return { authDesign };
  }, [appTheme]);
}
