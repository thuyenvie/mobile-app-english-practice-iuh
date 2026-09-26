import { useCallback, useState } from "react";

import { loginWithGoogleIdToken } from "../api/authApi";

export function useGoogleLogin() {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const completeGoogleSignIn = useCallback(async (idToken: string) => {
    setIsGoogleLoading(true);
    try {
      return await loginWithGoogleIdToken(idToken);
    } finally {
      setIsGoogleLoading(false);
    }
  }, []);

  return {
    completeGoogleSignIn,
    isGoogleLoading,
    // GoogleButton.web trực tiếp nhận credential từ GIS.
    signInWithGoogle: async () => null,
  };
}
