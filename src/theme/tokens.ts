export const spacing = { small: 8, medium: 16, large: 24 } as const;

export const typography = {
  body: { fontSize: 16 },
  label: { fontSize: 14, fontWeight: '500' },
  button: { fontSize: 16, fontWeight: '600' },
} as const;

export const authDesign = {
  colors: {
    background: '#000000',
    header: '#3498db',
    logo: '#d9d9d9',
    logoLine: '#252525',
    surface: '#414141',
    border: '#d0d0d0',
    text: '#ffffff',
    secondary: '#a5a5a5',
    primary: '#1684ed',
    primaryPressed: '#096dcc',
    placeholder: '#a0a0a0',
    google: '#4285f4',
  },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 18 },
  label: { ...typography.label, fontSize: 11, fontWeight: '600' },
  input: { minHeight: 40, borderRadius: 7 },
  button: { minHeight: 40, borderRadius: 7 },
  labelGap: 4,
  fieldGap: 14,
  loginFormGap: 36,
  registerFormGap: 64,
  googleGap: 32,
  contentPadding: 20,
  headerHeight: 137,
  headerRadius: 22,
  logoWidth: 100,
  logoHeight: 80,
} as const;

// Login-specific refinements keep the other auth screens unchanged.
export const loginDesign = {
  colors: {
    ...authDesign.colors,
    header: '#2389dc',
    surface: '#1c2029',
    border: '#343c49',
    secondary: '#b0b8c6',
    placeholder: '#8f9aab',
    link: '#75b8ff',
  },
  title: { fontSize: 26, lineHeight: 34, fontWeight: '700' },
  subtitle: { fontSize: 14, lineHeight: 21 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  input: {
    minHeight: 52,
    height: 'auto',
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#1c2029',
    borderColor: '#343c49',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#ffffff',
    placeholderTextColor: '$placeholderColor',
    selectionColor: '$primary',
    focusStyle: { borderColor: '#75b8ff' },
  },
  button: {
    minHeight: 52,
    borderRadius: 12,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600',
  },
} as const;

export const homeDesign = {
  colors: {
    background: authDesign.colors.background,
    text: authDesign.colors.text,
    secondary: '#99999f',
    link: '#62a7df',
    card: '#d9d9d9',
    cardText: '#111111',
    cardTrack: '#f5f5f5',
    surface: '#1e1e1e',
    surfaceRaised: '#2b2b2d',
    border: '#3a3a3c',
    tab: '#609fda',
    tabActive: '#c2ef50',
    completed: '#22c55e',
    inProgress: '#ffa600',
    notStarted: '#66666b',
  },
  maxWidth: 480,
  pagePadding: 16,
  tabHeight: 60,
} as const;

export const aiDesign = {
  colors: {
    background: authDesign.colors.background,
    text: authDesign.colors.text,
    surface: authDesign.colors.surface,
    secondary: authDesign.colors.secondary,
    accent: '#aaa2ef',
    avatar: '#242458',
    robot: '#e5b950',
    camera: '#f88a45',
    send: '#419feb',
  },
  cardRadius: 30,
  cardMinHeight: 120,
} as const;
