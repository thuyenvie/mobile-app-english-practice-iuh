import { Button, type ButtonProps } from "tamagui";
import { Platform } from "react-native";

import { authDesign, typography } from "@/theme/tokens";

type AppButtonProps = ButtonProps & { appearance?: "primary" | "text" };

export function AppButton({
  appearance = "primary",
  accessibilityState,
  ...props
}: AppButtonProps) {
  // Web dung ARIA; khong dua accessibilityState vao the button cua DOM.
  const accessibilityProps = accessibilityState
    ? Platform.OS === "web"
      ? {
          "aria-disabled": accessibilityState.disabled,
          "aria-pressed": accessibilityState.selected,
          "aria-checked": accessibilityState.checked,
          "aria-busy": accessibilityState.busy,
          "aria-expanded": accessibilityState.expanded,
        }
      : { accessibilityState }
    : {};

  if (appearance === "text") {
    return (
      <Button
        unstyled
        backgroundColor="transparent"
        borderWidth={0}
        padding={0}
        minHeight="$touchTarget"
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
      minHeight="$control"
      height="auto"
      paddingVertical="$medium"
      borderRadius="$control"
      backgroundColor={authDesign.colors.primary}
      color={authDesign.colors.text}
      {...typography.button}
      borderWidth={0}
      role="button"
      pressStyle={{ backgroundColor: authDesign.colors.primaryPressed }}
      {...accessibilityProps}
      {...props}
    />
  );
}
