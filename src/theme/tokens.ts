export const spacing = { small: 8, medium: 16, large: 24 } as const;

export const typography = {
  body: { fontSize: 16 },
  label: { fontSize: 14, fontWeight: '500' },
  button: { fontSize: 16, fontWeight: '600' },
} as const;

export const authDesign = {
  colors: {
    background: '#ffffff',
    header: '#f1f5f4',
    logo: '#e0e8e5',
    logoLine: '#8a9c95',
    surface: '#f8faf9',
    border: '#cbd5d1',
    text: '#17251f',
    google: '#4285f4',
  },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { fontSize: 14, lineHeight: 21 },
  caption: { fontSize: 12, lineHeight: 18 },
  label: typography.label,
  input: { minHeight: 48, borderRadius: 12 },
  button: { minHeight: 48, borderRadius: 12 },
  labelGap: 8,
  fieldGap: 24,
  loginFormGap: 32,
  registerFormGap: 32,
  googleGap: 24,
  contentPadding: 24,
  headerHeight: 180,
  headerRadius: 32,
  logoWidth: 120,
  logoHeight: 96,
} as const;
