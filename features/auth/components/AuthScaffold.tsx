import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Theme, YStack } from 'tamagui';

import { authDesign, spacing } from '@/theme/tokens';
import { AuthHeader } from './AuthHeader';

export function AuthScaffold({ children, onBack }: PropsWithChildren<{ onBack?: () => void }>) {
  const insets = useSafeAreaInsets();

  return (
    <Theme name="light_auth">
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}>
          <YStack paddingBottom={insets.bottom + spacing.large}
            paddingLeft={insets.left} paddingRight={insets.right}>
            <YStack width="100%" maxWidth={480} alignSelf="center">
              <AuthHeader onBack={onBack} />
              <YStack padding={authDesign.contentPadding}>{children}</YStack>
            </YStack>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </Theme>
  );
}

// Only the native keyboard/scroll containers use RN styles; UI stays in Tamagui.
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: authDesign.colors.background },
  scroll: { flex: 1 },
  content: { flexGrow: 1 },
});
