import { defaultConfig } from '@tamagui/config/v5';
import { createTamagui } from 'tamagui';

import { authDesign, spacing } from './src/theme/tokens';

export const config = createTamagui({
  ...defaultConfig,
  settings: { ...defaultConfig.settings, onlyAllowShorthands: false },
  tokens: {
    ...defaultConfig.tokens,
    space: { ...defaultConfig.tokens.space, ...spacing },
    size: { ...defaultConfig.tokens.size, control: 48, touchTarget: 44 },
    radius: { ...defaultConfig.tokens.radius, control: 12 },
  },
  themes: {
    light_auth: {
      ...defaultConfig.themes.light,
      background: authDesign.colors.background,
      color: authDesign.colors.text,
      textSecondary: authDesign.colors.secondary,
      primary: '#1684ed',
      primaryPressed: '#096dcc',
      onPrimary: '#ffffff',
      inputBackground: authDesign.colors.surface,
      borderColor: authDesign.colors.border,
      placeholderColor: '#a0a0a0',
    },
  },
});

type AppConfig = typeof config;

declare module 'tamagui' {
  // Tamagui requires an interface here for declaration merging.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppConfig {}
}
