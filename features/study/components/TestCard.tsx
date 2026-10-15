import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/ui/AppButton";
import { homeDesign } from "@/theme/tokens";

export function TestCard({
  year,
  testNumber,
  onPress,
}: {
  year: number;
  testNumber: number;
  onPress: () => void;
}) {
  return (
    <YStack
      backgroundColor={homeDesign.colors.surface}
      borderWidth={1}
      borderColor={homeDesign.colors.border}
      borderRadius={18}
      padding={16}
      gap={14}
    >
      <XStack alignItems="center" gap={12}>
        <YStack
          width={48}
          height={48}
          borderRadius={14}
          backgroundColor={homeDesign.colors.tab}
          alignItems="center"
          justifyContent="center"
        >
          <MaterialCommunityIcons
            name="file-document-outline"
            size={27}
            color="#111111"
          />
        </YStack>
        <YStack flex={1} gap={4}>
          <Text color={homeDesign.colors.text} fontSize={17} fontWeight="700">
            ETS {year} · Test {String(testNumber).padStart(2, "0")}
          </Text>
          <Text color={homeDesign.colors.secondary} fontSize={12}>
            7 Parts · 200 câu · 120 phút
          </Text>
        </YStack>
        <MaterialIcons
          name="chevron-right"
          size={25}
          color={homeDesign.colors.secondary}
        />
      </XStack>
      <AppButton minHeight={40} paddingVertical={8} onPress={onPress}>
        Xem chi tiết đề
      </AppButton>
    </YStack>
  );
}
