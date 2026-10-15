export interface GoogleButtonProps {
  variant?: "login";
  disabled?: boolean;
  loading?: boolean;
  onError?: (message: string) => void;
  onIdToken?: (idToken: string) => void;
  onPress: () => void;
}

export declare function GoogleButton(
  props: GoogleButtonProps,
): React.JSX.Element;
