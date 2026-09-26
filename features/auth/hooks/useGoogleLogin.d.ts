import type { LoginResult } from "../api/authApi";

export declare function useGoogleLogin(): {
  completeGoogleSignIn: (idToken: string) => Promise<LoginResult>;
  isGoogleLoading: boolean;
  signInWithGoogle: () => Promise<LoginResult | null>;
};
