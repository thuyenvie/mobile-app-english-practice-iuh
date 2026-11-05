import type { ColorTokens } from "tamagui";

export const authFormDesign = {
  input: {
    minHeight: 44,
    borderRadius: 11,
    backgroundColor: "#F6FAFF",
    borderColor: "#BBD1ED",
    color: "#10264E",
    placeholderTextColor: "#526884" as ColorTokens,
    focusStyle: { borderColor: "#084CAB" },
  },
  label: { color: "#10264E", fontWeight: "600" },
  button: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#084CAB",
    color: "#FFFFFF",
    pressStyle: { backgroundColor: "#063D8B" },
  },
  link: "#084CAB",
  muted: "#425A7C",
  error: "#A4262C",
} as const;
