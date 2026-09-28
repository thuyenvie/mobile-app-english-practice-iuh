import { Text, XStack } from "tamagui";

import { homeDesign } from "@/theme/tokens";

export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <XStack alignItems="center" justifyContent="space-between" gap={12}>
      <Text color={homeDesign.colors.text} fontSize={16} fontWeight="700">
        {title}
      </Text>
      {hint ? (
        <Text color={homeDesign.colors.secondary} fontSize={11}>
          {hint}
        </Text>
      ) : null}
    </XStack>
  );
}
