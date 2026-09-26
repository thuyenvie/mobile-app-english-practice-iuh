import { Stack } from 'expo-router';
import { TamaguiProvider } from 'tamagui';

import { config } from '../../tamagui.config';
import { GoogleAuthProvider } from '@/providers/GoogleAuthProvider';

export default function RootLayout() {
  return (
    <TamaguiProvider config={config} defaultTheme="light_auth">
      <GoogleAuthProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </GoogleAuthProvider>
    </TamaguiProvider>
  );
}
