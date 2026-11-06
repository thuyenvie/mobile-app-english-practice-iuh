import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo } from "react";
import { Text, XStack } from "tamagui";



export function SectionTitle({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  const { homeDesign } = useThemedStyles();
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

function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { homeDesign } = appTheme;

    return { homeDesign };
  }, [appTheme]);
}
