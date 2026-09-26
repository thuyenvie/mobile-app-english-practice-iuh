import { GoogleOAuthProvider } from "@react-oauth/google";
import type { PropsWithChildren } from "react";

export function GoogleAuthProvider({ children }: PropsWithChildren) {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  if (!clientId) return children;

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>
  );
}
