import { useAppTheme } from "@/theme/useAppTheme";
import { useMemo as useThemeMemo } from "react";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';



const tabs = [
  { name: 'home', title: 'Trang chủ', icon: 'home-outline' },
  { name: 'ai', title: 'Gia sư AI', icon: 'auto-fix' },
  { name: 'study', title: 'Học tập', icon: 'file-document-outline' },
  { name: 'vocabulary', title: 'Từ vựng', icon: 'book-alphabet' },
  { name: 'settings', title: 'Cài đặt', icon: 'cog-outline' },
] as const;

export default function TabsLayout() {
  const { homeDesign, loginDesign, themeColor } = useThemedStyles();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const bottomPadding = Math.max(insets.bottom, 8);
  const tabWidth = Math.min(width - insets.left - insets.right, homeDesign.maxWidth) / tabs.length;
  const labelHeight = (tabWidth < 60 * fontScale ? 28 : 16) * fontScale;
  const barHeight = 48 + labelHeight;

  return (
    <YStack flex={1} backgroundColor={homeDesign.colors.background}>
      <YStack flex={1} width="100%" maxWidth={homeDesign.maxWidth} alignSelf="center">
        <Tabs initialRouteName="home" backBehavior="initialRoute" screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          animation: 'none',
          sceneStyle: { backgroundColor: homeDesign.colors.background },
          tabBarActiveTintColor: loginDesign.colors.link,
          tabBarInactiveTintColor: themeColor("#98a3b4", "text"),
          tabBarActiveBackgroundColor: homeDesign.colors.surfaceRaised,
          tabBarInactiveBackgroundColor: homeDesign.colors.surfaceRaised,
          tabBarLabelPosition: 'below-icon',
          tabBarIconStyle: styles.icon,
          tabBarItemStyle: styles.item,
          tabBarStyle: {
            height: barHeight + bottomPadding,
            paddingTop: 6,
            paddingBottom: bottomPadding,
            backgroundColor: themeColor("#161c26", "background"),
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: themeColor("#343c49", "border"),
            elevation: 0,
          },
        }}>
          {tabs.map((tab) => (
            <Tabs.Screen key={tab.name} name={tab.name} options={{
              title: tab.title,
              tabBarAccessibilityLabel: tab.title,
              tabBarLabel: ({ color }) => (
                <Text numberOfLines={2}
                  style={[styles.label, { color, minHeight: labelHeight }]}>
                  {tab.title}
                </Text>
              ),
              tabBarIcon: ({ color, focused }) => (
                <YStack width={44} height={30} borderRadius={12}
                  alignItems="center" justifyContent="center"
                  backgroundColor={focused ? themeColor("#203c5c", "background") : 'transparent'}>
                  <MaterialCommunityIcons name={tab.icon} size={24} color={color} />
                </YStack>
              ),
            }} />
          ))}
        </Tabs>
      </YStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  item: { flex: 1, minWidth: 0, paddingHorizontal: 0, paddingVertical: 0, borderWidth: 0 },
  icon: { width: 44, height: 30 },
  label: { fontSize: 11, lineHeight: 14, fontWeight: '600', textAlign: 'center', textAlignVertical: 'center', marginTop: 2 },
});

function useThemedStyles() {
  const appTheme = useAppTheme();
  return useThemeMemo(() => {
    const { homeDesign, loginDesign, themeColor } = appTheme;

    return { homeDesign, loginDesign, themeColor };
  }, [appTheme]);
}
