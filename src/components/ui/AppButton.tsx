import { Button, type ButtonProps } from "tamagui";

import { authDesign, typography } from "@/theme/tokens";

type AppButtonProps = ButtonProps & { appearance?: "primary" | "text" };

export function AppButton({
  appearance = "primary",
  ...props
}: AppButtonProps) {
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
      {...props}
    />
  );
}
