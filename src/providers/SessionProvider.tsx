import { Fragment, useEffect, type PropsWithChildren } from "react";
import { AppLoadingScreen } from "@/components/ui/AppLoadingScreen";
import { useSession } from "@/lib/auth/useSession";
import { restoreSession } from "@/lib/auth/restoreSession";

export function SessionProvider({ children }: PropsWithChildren) {
  const session = useSession();
  useEffect(() => { void restoreSession(); }, []);
  if (session.status === "loading") {
    return (
      <AppLoadingScreen
        message={session.error || "Đang kiểm tra phiên đăng nhập..."}
        onRetry={session.error ? () => void restoreSession() : undefined}
      />
    );
  }
  // All account-bound screen state is discarded together when identity changes.
  return <Fragment key={session.generation}>{children}</Fragment>;
}
