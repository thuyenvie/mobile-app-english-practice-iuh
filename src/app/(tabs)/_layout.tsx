import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

import { homeDesign } from '@/theme/tokens';

const tabs = [
  { name: 'home', title: 'Trang chủ', icon: 'home-outline' },
  { name: 'ai', title: 'Gia sư AI', icon: 'auto-fix' },
  { name: 'study', title: 'Học tập', icon: 'file-document-outline' },
  { name: 'vocabulary', title: 'Từ vựng', icon: 'book-alphabet' },
  { name: 'settings', title: 'Cài đặt', icon: 'cog-outline' },
] as const;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <YStack flex={1} backgroundColor={homeDesign.colors.background}>
      <YStack flex={1} width="100%" maxWidth={homeDesign.maxWidth} alignSelf="center">
        <Tabs initialRouteName="home" backBehavior="initialRoute" screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: homeDesign.colors.background },
          tabBarActiveTintColor: homeDesign.colors.cardText,
          tabBarInactiveTintColor: homeDesign.colors.cardText,
          tabBarActiveBackgroundColor: homeDesign.colors.tabActive,
          tabBarInactiveBackgroundColor: homeDesign.colors.tab,
          tabBarLabelPosition: 'below-icon',
          tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginBottom: 4 },
          tabBarItemStyle: { borderWidth: 0.5, borderColor: homeDesign.colors.cardText, paddingTop: 3 },
          tabBarStyle: { height: homeDesign.tabHeight + insets.bottom, paddingBottom: insets.bottom,
            backgroundColor: homeDesign.colors.tab, borderTopColor: homeDesign.colors.border },
        }}>
          {tabs.map((tab) => (
            <Tabs.Screen key={tab.name} name={tab.name} options={{
              title: tab.title,
              tabBarAccessibilityLabel: tab.title,
              tabBarIcon: ({ color }) => <MaterialCommunityIcons name={tab.icon} size={27} color={color} />,
            }} />
          ))}
        </Tabs>
      </YStack>
    </YStack>
  );
}
